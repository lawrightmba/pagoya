#!/usr/bin/env python3
"""
Run a single Taecel transaction inline.
Usage: python3 run_one_tx.py TEL150 5555555520
Prints JSON result to stdout.
"""

import json, os, subprocess, sys, time
from datetime import datetime

BASE_URL = os.environ.get("SIPREL_BASE_URL", "https://api-v1-fixedip.taecel.com/api/")
API_KEY  = os.environ["SIPREL_API_KEY"]
NIP      = os.environ["SIPREL_NIP"]

POLL_TIMEOUT_S  = 65
POLL_INTERVAL_S = 3


def curl_post(endpoint, params, timeout=30):
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
        raise RuntimeError(f"curl exit {result.returncode}: {result.stderr.strip()}")
    body = result.stdout.strip()
    if not body:
        raise RuntimeError("curl returned empty body")
    return json.loads(body)


def run_tx(producto, referencia):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] requestTXN producto={producto} referencia={referencia}", flush=True)

    try:
        r = curl_post("requestTXN", {"producto": producto, "referencia": referencia})
        print(f"  → success={r.get('success')}, error={r.get('error')}, msg={r.get('message')}", flush=True)
    except Exception as e:
        print(f"  → requestTXN EXCEPTION: {e}", flush=True)
        return {"fechaHora": now, "status": "error", "errorMsg": str(e)}

    if not r.get("success"):
        return {"fechaHora": now, "transID": None, "folio": None,
                "status": "error", "errorCode": r.get("error"), "errorMsg": r.get("message")}

    data = r.get("data", {})
    trans_id = data.get("transID") if isinstance(data, dict) else None
    if not trans_id:
        return {"fechaHora": now, "status": "error", "errorMsg": "no transID"}

    print(f"  → transID={trans_id}, polling statusTXN...", flush=True)
    start = time.time()
    poll = 0

    while True:
        elapsed = time.time() - start
        if elapsed >= POLL_TIMEOUT_S:
            print(f"  → TIMEOUT after {elapsed:.0f}s", flush=True)
            return {"fechaHora": now, "transID": trans_id, "status": "timeout"}

        poll += 1
        try:
            s = curl_post("statusTXN", {"transID": trans_id}, timeout=10)
            print(f"  [{poll}] statusTXN success={s.get('success')}, error={s.get('error')}, msg={s.get('message')}", flush=True)
        except Exception as e:
            print(f"  [{poll}] Type3 retry: {e}", flush=True)
            time.sleep(POLL_INTERVAL_S)
            continue

        if s.get("success") is True and isinstance(s.get("data"), dict):
            d = s["data"]
            print(f"  → EXITOSA Folio={d.get('Folio')} Carrier={d.get('Carrier')}", flush=True)
            return {"fechaHora": now, "transID": trans_id,
                    "folio": d.get("Folio"), "carrier": d.get("Carrier"),
                    "fecha": d.get("Fecha"), "bolsa": d.get("Bolsa"),
                    "monto": d.get("Monto"), "cargo": d.get("Cargo"),
                    "saldoFinal": d.get("Saldo Final"), "status": "Exitosa"}

        err = s.get("error")
        if err is not None and err != 0:
            d = s.get("data", {})
            folio   = d.get("Folio")   if isinstance(d, dict) else None
            carrier = d.get("Carrier") if isinstance(d, dict) else None
            print(f"  → ERROR {err}: {s.get('message')}", flush=True)
            return {"fechaHora": now, "transID": trans_id,
                    "folio": folio, "carrier": carrier,
                    "status": "error", "errorCode": err, "errorMsg": s.get("message")}

        time.sleep(POLL_INTERVAL_S)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: run_one_tx.py <producto> <referencia>", file=sys.stderr)
        sys.exit(1)
    result = run_tx(sys.argv[1], sys.argv[2])
    print(f"RESULT: {json.dumps(result)}", flush=True)
