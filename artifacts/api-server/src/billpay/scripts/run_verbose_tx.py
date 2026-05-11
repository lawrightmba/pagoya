#!/usr/bin/env python3
"""
Verbose single-transaction runner.
Logs complete raw JSON for requestTXN and every statusTXN poll.
Usage: python3 run_verbose_tx.py <producto> <referencia> <label>
"""

import json, os, subprocess, sys, time
from datetime import datetime

BASE_URL = os.environ.get("SIPREL_BASE_URL", "https://api-v1-fixedip.taecel.com/api/")
API_KEY  = os.environ["SIPREL_API_KEY"]
NIP      = os.environ["SIPREL_NIP"]

POLL_TIMEOUT_S  = 65
POLL_INTERVAL_S = 3
SEP = "─" * 70


def curl_post(endpoint, params, timeout=30):
    url = BASE_URL + endpoint
    form_data = "&".join(
        f"{k}={v}" for k, v in {"key": API_KEY, "nip": NIP, **params}.items()
    )
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


def run_verbose(producto, referencia, label):
    started_at = datetime.now()
    fecha_hora  = started_at.strftime("%Y-%m-%d %H:%M:%S")

    print(f"\n{SEP}", flush=True)
    print(f"  {label}  |  SKU: {producto}  |  REF: {referencia}", flush=True)
    print(f"  FECHA/HORA: {fecha_hora}", flush=True)
    print(SEP, flush=True)

    # ── 1. requestTXN ─────────────────────────────────────────────────────────
    print(f"\n[requestTXN] → POST {BASE_URL}requestTXN", flush=True)
    print(f"  params: producto={producto} referencia={referencia}", flush=True)

    try:
        req_raw = curl_post("requestTXN", {"producto": producto, "referencia": referencia})
    except Exception as e:
        print(f"  EXCEPTION: {e}", flush=True)
        return {
            "label": label, "producto": producto, "referencia": referencia,
            "fechaHora": fecha_hora, "status": "error",
            "requestTXN_raw": None, "statusTXN_polls": [],
            "errorMsg": str(e),
        }

    print(f"\n[requestTXN raw response]", flush=True)
    print(json.dumps(req_raw, indent=2, ensure_ascii=False), flush=True)

    if not req_raw.get("success"):
        return {
            "label": label, "producto": producto, "referencia": referencia,
            "fechaHora": fecha_hora,
            "transID": None, "folio": None,
            "status": "error",
            "errorCode": req_raw.get("error"),
            "errorMsg": req_raw.get("message"),
            "requestTXN_raw": req_raw,
            "statusTXN_polls": [],
        }

    data = req_raw.get("data", {})
    trans_id = data.get("transID") if isinstance(data, dict) else None
    if not trans_id:
        return {
            "label": label, "producto": producto, "referencia": referencia,
            "fechaHora": fecha_hora, "status": "error",
            "errorMsg": "no transID in requestTXN response",
            "requestTXN_raw": req_raw, "statusTXN_polls": [],
        }

    print(f"\n  transID: {trans_id}", flush=True)
    print(f"  Beginning statusTXN polling (max {POLL_TIMEOUT_S}s, {POLL_INTERVAL_S}s sleep)...", flush=True)

    # ── 2. Poll statusTXN ─────────────────────────────────────────────────────
    polls = []
    start  = time.time()
    poll_n = 0

    while True:
        elapsed = time.time() - start
        if elapsed >= POLL_TIMEOUT_S:
            print(f"\n  [TIMEOUT] {elapsed:.1f}s elapsed — stopping poll", flush=True)
            return {
                "label": label, "producto": producto, "referencia": referencia,
                "fechaHora": fecha_hora, "transID": trans_id,
                "folio": None, "status": "timeout",
                "requestTXN_raw": req_raw, "statusTXN_polls": polls,
            }

        poll_n += 1
        poll_ts = datetime.now().strftime("%H:%M:%S")
        print(f"\n[statusTXN poll #{poll_n} @ {poll_ts}  elapsed={elapsed:.1f}s]", flush=True)

        try:
            s = curl_post("statusTXN", {"transID": trans_id}, timeout=10)
        except Exception as e:
            msg = str(e)
            print(f"  Type3 (call exception) — will retry in {POLL_INTERVAL_S}s: {msg}", flush=True)
            polls.append({"poll": poll_n, "ts": poll_ts, "exception": msg})
            time.sleep(POLL_INTERVAL_S)
            continue

        print(json.dumps(s, indent=2, ensure_ascii=False), flush=True)
        polls.append({"poll": poll_n, "ts": poll_ts, "raw": s})

        # Type 1 — confirmed success
        if s.get("success") is True and isinstance(s.get("data"), dict):
            d = s["data"]
            folio   = d.get("Folio")
            carrier = d.get("Carrier")
            cargo   = d.get("Cargo")
            print(f"\n  → TYPE 1 (SUCCESS): Folio={folio}  Carrier={carrier}  Cargo={cargo}", flush=True)
            return {
                "label": label, "producto": producto, "referencia": referencia,
                "fechaHora": fecha_hora, "transID": trans_id,
                "folio": folio, "carrier": carrier,
                "fecha": d.get("Fecha"), "bolsa": d.get("Bolsa"),
                "monto": d.get("Monto"), "cargo": cargo,
                "saldoFinal": d.get("Saldo Final"),
                "status": "Exitosa", "descripcion": s.get("message"),
                "requestTXN_raw": req_raw, "statusTXN_polls": polls,
            }

        # Type 2 — confirmed failure
        err = s.get("error")
        if err is not None and err != 0:
            d   = s.get("data", {})
            print(f"\n  → TYPE 2 (FAILURE): error={err}  msg={s.get('message')}", flush=True)
            return {
                "label": label, "producto": producto, "referencia": referencia,
                "fechaHora": fecha_hora, "transID": trans_id,
                "folio": d.get("Folio") if isinstance(d, dict) else None,
                "carrier": d.get("Carrier") if isinstance(d, dict) else None,
                "status": "error", "errorCode": err,
                "errorMsg": s.get("message"), "descripcion": s.get("message"),
                "requestTXN_raw": req_raw, "statusTXN_polls": polls,
            }

        # Type 3 — en proceso, retry
        print(f"  → TYPE 3 (En Proceso) — sleeping {POLL_INTERVAL_S}s", flush=True)
        time.sleep(POLL_INTERVAL_S)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: run_verbose_tx.py <producto> <referencia> <label>", file=sys.stderr)
        sys.exit(1)

    producto   = sys.argv[1]
    referencia = sys.argv[2]
    label      = sys.argv[3]

    result = run_verbose(producto, referencia, label)

    print(f"\n{SEP}", flush=True)
    print(f"  FINAL RESULT — {label}", flush=True)
    print(SEP, flush=True)
    print(json.dumps(result, indent=2, ensure_ascii=False), flush=True)
