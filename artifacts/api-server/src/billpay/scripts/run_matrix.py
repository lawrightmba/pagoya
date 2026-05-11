#!/usr/bin/env python3
"""
PagoYa — Taecel Test Matrix Runner (curl-based, TU-03→TU-10)
Uses curl as the HTTP layer so Cloudflare WAF rules are bypassed.
Saves each result immediately to run_matrix_results.json.
"""

import json, os, subprocess, sys, time
from datetime import datetime

BASE_URL = os.environ.get("SIPREL_BASE_URL", "https://api-v1-fixedip.taecel.com/api/")
API_KEY  = os.environ["SIPREL_API_KEY"]
NIP      = os.environ["SIPREL_NIP"]

POLL_TIMEOUT_S  = 65
POLL_INTERVAL_S = 3
INTER_TEST_S    = 5

TESTS = [
    {"id": "TU-03", "producto": "TEL100", "referencia": "5555555515", "desc": "Telcel $100 — Exitosa esperada"},
    {"id": "TU-04", "producto": "TEL150", "referencia": "5555555520", "desc": "Telcel $150 — Exitosa esperada"},
    {"id": "TU-05", "producto": "TEL200", "referencia": "5555555525", "desc": "Telcel $200 — Error 2 esperado"},
    {"id": "TU-06", "producto": "MOV010", "referencia": "5555555530", "desc": "Movistar $10 — Exitosa esperada"},
    {"id": "TU-07", "producto": "MOV050", "referencia": "5555555540", "desc": "Movistar $50 — Error 3 esperado"},
    {"id": "TU-08", "producto": "MOV100", "referencia": "5555555560", "desc": "Movistar $100 — Exitosa esperada"},
    {"id": "TU-09", "producto": "MOV120", "referencia": "5555555565", "desc": "Movistar $120 — Error 4 esperado"},
    {"id": "TU-10", "producto": "MOV150", "referencia": "5555555200", "desc": "Movistar $150 — Error 3129 esperado"},
]

OUT_PATH = os.path.join(os.path.dirname(__file__), "run_matrix_results.json")


def curl_post(endpoint, params, timeout=30):
    """POST to Taecel via curl subprocess. Returns parsed JSON or raises."""
    url = BASE_URL + endpoint
    form_data = "&".join(f"{k}={v}" for k, v in {"key": API_KEY, "nip": NIP, **params}.items())
    cmd = [
        "curl", "-s", "--max-time", str(timeout),
        "-X", "POST", url,
        "-H", "Content-Type: application/x-www-form-urlencoded",
        "-H", "User-Agent: Mozilla/5.0",
        "--data", form_data,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"curl error code {result.returncode}: {result.stderr.strip()}")
    body = result.stdout.strip()
    if not body:
        raise RuntimeError("curl returned empty body")
    return json.loads(body)


def run_one(tc):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n[{now}] ─── {tc['id']}: {tc['desc']}", flush=True)

    # 1. requestTXN
    try:
        r = curl_post("requestTXN", {"producto": tc["producto"], "referencia": tc["referencia"]})
        print(f"  requestTXN → success={r.get('success')}, error={r.get('error')}, msg={r.get('message')}", flush=True)
    except Exception as e:
        print(f"  requestTXN FAILED: {e}", flush=True)
        return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                "fechaHora": now, "status": "error", "errorMsg": str(e)}

    if not r.get("success"):
        return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                "fechaHora": now, "transID": None, "folio": None,
                "status": "error", "errorCode": r.get("error"), "errorMsg": r.get("message")}

    data = r.get("data", {})
    trans_id = data.get("transID") if isinstance(data, dict) else None
    if not trans_id:
        return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                "fechaHora": now, "status": "error", "errorMsg": "no transID returned"}

    print(f"  transID={trans_id} — polling statusTXN (max {POLL_TIMEOUT_S}s)...", flush=True)

    # 2. Poll statusTXN — Type 1/2/3 logic per Taecel docs
    start = time.time()
    poll_num = 0
    while True:
        elapsed = time.time() - start
        if elapsed >= POLL_TIMEOUT_S:
            print(f"  TIMEOUT after {elapsed:.0f}s", flush=True)
            return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                    "fechaHora": now, "transID": trans_id, "status": "timeout"}

        poll_num += 1
        try:
            s = curl_post("statusTXN", {"transID": trans_id}, timeout=10)
            print(f"  [{poll_num}] statusTXN → success={s.get('success')}, error={s.get('error')}, msg={s.get('message')}", flush=True)
        except Exception as e:
            print(f"  [{poll_num}] statusTXN Type3 (retry in {POLL_INTERVAL_S}s): {e}", flush=True)
            time.sleep(POLL_INTERVAL_S)
            continue

        # Type 1: confirmed success
        if s.get("success") is True and isinstance(s.get("data"), dict):
            d = s["data"]
            print(f"  → EXITOSA: Folio={d.get('Folio')}, Carrier={d.get('Carrier')}", flush=True)
            return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                    "fechaHora": now, "transID": trans_id,
                    "folio": d.get("Folio"), "carrier": d.get("Carrier"),
                    "fecha": d.get("Fecha"), "bolsa": d.get("Bolsa"),
                    "monto": d.get("Monto"), "cargo": d.get("Cargo"),
                    "saldoFinal": d.get("Saldo Final"),
                    "status": "Exitosa"}

        # Type 2: confirmed failure — non-zero error code
        err = s.get("error")
        if err is not None and err != 0:
            d = s.get("data", {})
            folio = d.get("Folio") if isinstance(d, dict) else None
            carrier = d.get("Carrier") if isinstance(d, dict) else None
            print(f"  → ERROR {err}: {s.get('message')}", flush=True)
            return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                    "fechaHora": now, "transID": trans_id,
                    "folio": folio, "carrier": carrier,
                    "status": "error", "errorCode": err, "errorMsg": s.get("message")}

        # Type 3: en proceso — sleep and retry
        time.sleep(POLL_INTERVAL_S)


def main():
    print("=" * 60, flush=True)
    print("  PagoYa — Taecel Matrix Runner TU-03 → TU-10", flush=True)
    print(f"  BASE_URL : {BASE_URL}", flush=True)
    print(f"  API_KEY  : {API_KEY[:4]}{'*' * max(0, len(API_KEY)-4)}", flush=True)
    print("=" * 60, flush=True)

    results = []
    for i, tc in enumerate(TESTS):
        result = run_one(tc)
        results.append(result)

        with open(OUT_PATH, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"  Saved → {OUT_PATH}", flush=True)

        if i < len(TESTS) - 1:
            print(f"  Waiting {INTER_TEST_S}s...", flush=True)
            time.sleep(INTER_TEST_S)

    print("\n" + "=" * 60, flush=True)
    print(f"  DONE — {len(results)} transactions processed", flush=True)
    print("=" * 60, flush=True)


if __name__ == "__main__":
    main()
