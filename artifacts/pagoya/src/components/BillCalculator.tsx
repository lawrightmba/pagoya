import { useState } from "react";
import { useLocation } from "wouter";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const FEE = 25;

interface Props {
  label?: string;
}

export default function BillCalculator({ label = "¿Cuánto debes este mes?" }: Props) {
  const [, navigate] = useLocation();
  const [raw, setRaw] = useState("");

  const amount = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
  const total = amount > 0 ? amount + FEE : 0;

  return (
    <div style={{
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(0,200,117,0.35)",
      borderRadius: 16,
      padding: "20px 18px",
      marginBottom: 8,
    }}>
      <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 14, color: "#fff" }}>
        🧮 {label}
      </p>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{
          position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
          fontSize: 18, fontWeight: 700, color: "#00C875",
        }}>$</span>
        <input
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={raw}
          onChange={e => setRaw(e.target.value)}
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.06)",
            border: "1.5px solid rgba(255,255,255,0.18)",
            borderRadius: 10,
            padding: "12px 14px 12px 30px",
            fontSize: 22,
            fontWeight: 800,
            color: "#fff",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <span style={{
          position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 600,
        }}>MXN</span>
      </div>

      {amount > 0 && (
        <div style={{
          background: "rgba(0,200,117,0.1)",
          border: "1px solid rgba(0,200,117,0.25)",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 12,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
            <span>Tu recibo</span>
            <span>${amount.toFixed(2)} MXN</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
            <span>Comisión PagoYa</span>
            <span>$25.00 MXN</span>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: "#00C875" }}>
            <span>Total a pagar</span>
            <span>${total.toFixed(2)} MXN</span>
          </div>
        </div>
      )}

      <button
        onClick={() => navigate(`${BASE_URL}/register`)}
        style={{
          width: "100%",
          background: "#00C875",
          color: "#003d26",
          border: "none",
          borderRadius: 10,
          padding: "13px",
          fontSize: 15,
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        {amount > 0
          ? `Pagar $${total.toFixed(2)} MXN →`
          : "Crear cuenta gratis + $150 MXN →"}
      </button>
      <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
        Sin cuenta bancaria · Folio de comprobante al instante
      </p>
    </div>
  );
}
