#!/usr/bin/env python3
"""
PagoYa — Taecel Test Matrix Runner (Python)
Runs transactions TU-03 through TU-10 sequentially.
Saves each result immediately to run_matrix_results.json.
"""

import json, os, sys, time, urllib.request, urllib.parse, urllib.error
from datetime import datetime

BASE_URL = os.environ.get("SIPREL_BASE_URL", "https://api-v1-fixedip.taecel.com/api/")
API_KEY  = os.environ["SIPREL_API_KEY"]
NIP      = os.environ["SIPREL_NIP"]

POLL_TIMEOUT_S   = 65
POLL_INTERVAL_S  = 3
INTER_TEST_S     = 5
REQUEST_TIMEOUT  = 30

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

def taecel_post(endpoint, params, timeout=REQUEST_TIMEOUT):
    payload = urllib.parse.urlencode({"key": API_KEY, "nip": NIP, **params}).encode()
    url = BASE_URL + endpoint
    req = urllib.request.Request(url, data=payload,
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())

def run_one(tc):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n[{now}] ─── {tc['id']}: {tc['desc']}", flush=True)

    # 1. requestTXN
    try:
        r = taecel_post("requestTXN", {"producto": tc["producto"], "referencia": tc["referencia"]})
        print(f"  requestTXN → success={r.get('success')}, error={r.get('error')}, msg={r.get('message')}", flush=True)
    except Exception as e:
        print(f"  requestTXN EXCEPTION: {e}", flush=True)
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
                "fechaHora": now, "status": "error", "errorMsg": "no transID in requestTXN response"}

    print(f"  transID={trans_id} — polling statusTXN...", flush=True)

    # 2. Poll statusTXN
    start = time.time()
    while True:
        elapsed = time.time() - start
        if elapsed >= POLL_TIMEOUT_S:
            print(f"  TIMEOUT after {elapsed:.0f}s", flush=True)
            return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                    "fechaHora": now, "transID": trans_id, "status": "timeout"}

        try:
            s = taecel_post("statusTXN", {"transID": trans_id}, timeout=10)
            print(f"  statusTXN → success={s.get('success')}, error={s.get('error')}, msg={s.get('message')}", flush=True)
        except Exception as e:
            print(f"  statusTXN Type3 exception (retry in {POLL_INTERVAL_S}s): {e}", flush=True)
            time.sleep(POLL_INTERVAL_S)
            continue

        # Type 1: success
        if s.get("success") is True and isinstance(s.get("data"), dict):
            d = s["data"]
            return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                    "fechaHora": now, "transID": trans_id,
                    "folio": d.get("Folio"), "carrier": d.get("Carrier"),
                    "fecha": d.get("Fecha"), "bolsa": d.get("Bolsa"),
                    "monto": d.get("Monto"), "cargo": d.get("Cargo"),
                    "saldoFinal": d.get("Saldo Final"),
                    "status": "Exitosa"}

        # Type 2: error (non-zero error code)
        err = s.get("error")
        if err is not None and err != 0:
            d = s.get("data", {})
            return {"id": tc["id"], "producto": tc["producto"], "referencia": tc["referencia"],
                    "fechaHora": now, "transID": trans_id,
                    "folio": d.get("Folio") if isinstance(d, dict) else None,
                    "carrier": d.get("Carrier") if isinstance(d, dict) else None,
                    "status": "error", "errorCode": err, "errorMsg": s.get("message")}

        # Type 3: en proceso — sleep and retry
        time.sleep(POLL_INTERVAL_S)

def main():
    print("=" * 60, flush=True)
    print("  PagoYa — Taecel Matrix Runner TU-03→TU-10", flush=True)
    print("=" * 60, flush=True)

    results = []
    for i, tc in enumerate(TESTS):
        result = run_one(tc)
        results.append(result)

        # Save after every single result
        with open(OUT_PATH, "w") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"  → Saved to {OUT_PATH}", flush=True)

        if i < len(TESTS) - 1:
            print(f"  Waiting {INTER_TEST_S}s before next transaction...", flush=True)
            time.sleep(INTER_TEST_S)

    print("\n" + "=" * 60, flush=True)
    print("  DONE — all 8 transactions processed", flush=True)
    print("=" * 60, flush=True)

if __name__ == "__main__":
    main()
