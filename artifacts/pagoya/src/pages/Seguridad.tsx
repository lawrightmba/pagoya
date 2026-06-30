import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, ShieldCheck } from "lucide-react";
import GlobalFooter from "@/components/GlobalFooter";

const WA_SECURITY = "https://wa.me/14343319311?text=Tengo%20un%20problema%20de%20seguridad%20con%20mi%20cuenta";
const WA_NUMBER_DISPLAY = "+1 (434) 331-9311";

const sections = [
  {
    title: "Verifica que realmente eres tú quien habla con Paula",
    items: [
      "Paula nunca te va a pedir tu contraseña ni el código que recibes por SMS.",
      `El número oficial de WhatsApp de PagoYa es ${WA_NUMBER_DISPLAY} — guárdalo en tus contactos para reconocerlo siempre.`,
      "Si recibes un mensaje de otro número diciendo que es PagoYa, repórtalo de inmediato.",
    ],
  },
  {
    title: "Nunca compartas tu código de verificación",
    items: [
      "El código que te enviamos por SMS o WhatsApp es solo para ti.",
      "Ningún empleado de PagoYa, ni Paula, te lo van a pedir nunca, por ningún motivo.",
      "Si alguien te lo pide diciendo que es 'soporte de PagoYa', es un fraude.",
    ],
  },
  {
    title: "Reconoce los mensajes falsos",
    items: [
      "Desconfía de mensajes que crean urgencia ('tu cuenta será bloqueada en 1 hora').",
      "Desconfía de links que no terminan en pagoyamx.com.",
      "PagoYa nunca te pedirá que instales una aplicación fuera de Google Play / App Store.",
    ],
  },
  {
    title: "Mantén tu cuenta protegida",
    items: [
      "Usa un código de desbloqueo en tu teléfono — no dejes tu WhatsApp accesible a otras personas.",
      "Si cambias de número de teléfono, avísanos de inmediato desde la app o por WhatsApp.",
      "Revisa tus pagos y tu Puntaje de Confianza regularmente — si ves algo que no reconoces, repórtalo.",
    ],
  },
  {
    title: "Presta atención a las alertas de seguridad",
    items: [
      "Te avisamos por WhatsApp cada vez que se hace un pago desde tu cuenta.",
      "Si recibes una alerta de un pago que no hiciste, contáctanos de inmediato.",
    ],
  },
];

function Section({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
      >
        <span className="text-sm font-bold text-gray-800">{title}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-3">
          <ul className="space-y-3">
            {items.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-[#1D9E75] font-bold text-sm flex-shrink-0 mt-0.5">✓</span>
                <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Seguridad() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Seguridad — PagoYa</title>
        <meta name="description" content="Cómo mantener tu cuenta PagoYa segura y protegerte de fraudes por WhatsApp." />
      </Helmet>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-10">
        <div className="flex items-start gap-4 mb-8">
          <div className="bg-[#F0FAF3] p-3 rounded-2xl flex-shrink-0">
            <ShieldCheck className="w-7 h-7 text-[#1D9E75]" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#004F2D] leading-tight mb-2">
              Usa PagoYa con tranquilidad
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Aquí tienes todo lo que necesitas saber para mantener tu cuenta segura.
            </p>
          </div>
        </div>

        <div className="bg-[#FFF8E7] border border-amber-200 rounded-2xl px-5 py-4 mb-8">
          <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
            Número oficial de WhatsApp
          </p>
          <p className="text-sm text-amber-900 font-bold text-lg">{WA_NUMBER_DISPLAY}</p>
          <p className="text-xs text-amber-700 mt-1">
            Guárdalo en tus contactos ahora — es la forma más fácil de verificar que un mensaje es real.
          </p>
        </div>

        <div className="space-y-3 mb-10">
          {sections.map((s) => (
            <Section key={s.title} title={s.title} items={s.items} />
          ))}
        </div>

        <div id="reportar" className="bg-[#F0FAF3] border border-[#C6EDD4] rounded-2xl px-5 py-6">
          <p className="text-sm font-bold text-[#004F2D] mb-1">
            ¿Tienes un problema de seguridad?
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Escríbenos de inmediato por WhatsApp. Un miembro del equipo revisará tu caso directamente.
          </p>
          <a
            href={WA_SECURITY}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#004F2D] text-white text-sm font-bold px-5 py-3 rounded-full"
          >
            <MessageCircle className="w-4 h-4" />
            Reportar un problema de seguridad
          </a>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
