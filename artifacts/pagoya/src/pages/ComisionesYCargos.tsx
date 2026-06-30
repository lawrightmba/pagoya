import { Helmet } from "react-helmet-async";
import { MessageCircle } from "lucide-react";
import GlobalFooter from "@/components/GlobalFooter";

const PLATFORM_FEE = 25;
const WA = "https://wa.me/14343319311?text=Tengo%20una%20duda%20sobre%20un%20cargo%20en%20mi%20cuenta";

const services = [
  { label: "Pago de CFE", fee: `$${PLATFORM_FEE} MXN` },
  { label: "Pago de agua", fee: `$${PLATFORM_FEE} MXN` },
  { label: "Recargas telefónicas", fee: `$${PLATFORM_FEE} MXN` },
  { label: "Bono de bienvenida ($150 MXN)", fee: "Sin costo" },
  { label: "Pagos gratis por nivel (Bronce, Plata, Oro, Élite)", fee: "Sin costo" },
];

const neverPay = [
  "Sin cuota mensual",
  "Sin penalización por no usar la cuenta",
  "Sin cargo por cancelar",
  "Sin comisión escondida en el tipo de cambio o en el monto del servicio",
  "Sin contrato de permanencia",
];

export default function ComisionesYCargos() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Comisiones y cargos — PagoYa</title>
        <meta name="description" content="Una sola comisión de $25 MXN por transacción. Sin sorpresas, sin cuota mensual." />
      </Helmet>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-[#004F2D] leading-tight mb-3">
            Una sola comisión.<br />Sin sorpresas.
          </h1>
          <p className="text-gray-600 text-base leading-relaxed">
            Así de simple: pagas tu servicio, cobramos{" "}
            <span className="font-bold text-gray-800">${PLATFORM_FEE} MXN de comisión</span> por
            transacción. Nada más.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">
            Tabla de comisiones
          </h2>
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            {services.map((s, i) => (
              <div
                key={s.label}
                className={[
                  "flex items-center justify-between px-5 py-4 gap-4",
                  i < services.length - 1 ? "border-b border-gray-100" : "",
                ].join(" ")}
              >
                <span className="text-sm text-gray-700">{s.label}</span>
                <span
                  className={[
                    "text-sm font-bold flex-shrink-0",
                    s.fee === "Sin costo" ? "text-[#1D9E75]" : "text-gray-900",
                  ].join(" ")}
                >
                  {s.fee}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">
            Lo que nunca vas a pagar
          </h2>
          <ul className="space-y-3">
            {neverPay.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-red-400 font-bold text-sm flex-shrink-0 mt-0.5">✕</span>
                <span className="text-sm text-gray-600">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#F0FAF3] border border-[#C6EDD4] rounded-2xl px-5 py-6">
          <p className="text-sm font-bold text-[#004F2D] mb-1">
            ¿Tienes dudas sobre algún cargo en tu cuenta?
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Escríbenos por WhatsApp y te respondemos en minutos, no en días.
          </p>
          <a
            href={WA}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#004F2D] text-white text-sm font-bold px-5 py-3 rounded-full"
          >
            <MessageCircle className="w-4 h-4" />
            Hablar con soporte
          </a>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
