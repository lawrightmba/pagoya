import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import GlobalFooter from "@/components/GlobalFooter";

const WA = "https://wa.me/14343319311";

const faqs = [
  {
    q: "¿Qué es PagoYa?",
    a: "PagoYa es una plataforma para pagar servicios como CFE, agua y recargas telefónicas desde WhatsApp — sin necesidad de cuenta bancaria ni tarjeta de crédito.",
  },
  {
    q: "¿Cuánto cobra PagoYa por cada pago?",
    a: "Una comisión fija de $25 MXN por transacción. Sin cuotas mensuales, sin contratos, sin cargos ocultos.",
  },
  {
    q: "¿Cómo cargo saldo a mi cuenta?",
    a: "Puedes cargar saldo en efectivo en cualquier OXXO usando tu referencia de depósito, o con tarjeta débito o crédito directamente en la app.",
  },
  {
    q: "¿Es seguro dejar saldo en mi cuenta PagoYa?",
    a: "Los fondos son procesados a través de instituciones autorizadas. Tu saldo no es un depósito bancario — te recomendamos mantener solo el saldo que vas a usar en el corto plazo.",
  },
  {
    q: "¿Qué es el Puntaje de Confianza (PTI)?",
    a: "Es una calificación interna que refleja tu historial de pagos en PagoYa. A mayor puntaje, accedes a mejores recompensas y pagos gratuitos. No es una calificación crediticia oficial.",
  },
  {
    q: "¿Cómo puedo ganar pagos gratis?",
    a: "Acumulando puntos de lealtad a través de tus pagos y subiendo de nivel (Bronce, Plata, Oro, Élite). También puedes ganar créditos al alcanzar hitos en tu Puntaje de Confianza.",
  },
  {
    q: "¿Qué hago si un pago no se reflejó?",
    a: "Escríbenos por WhatsApp con tu número de confirmación y lo resolvemos directamente. La mayoría de los casos se resuelven en minutos.",
  },
  {
    q: "¿Puedo cancelar mi cuenta?",
    a: "Sí. Escríbenos por WhatsApp indicando que quieres cancelar tu cuenta y te guiamos en el proceso. No hay penalización.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
      >
        <span className="text-sm font-bold text-gray-800">{q}</span>
        {open ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-3">
          <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Preguntas frecuentes — PagoYa</title>
        <meta name="description" content="Respuestas a las preguntas más comunes sobre PagoYa — pagos, saldo, comisiones y seguridad." />
      </Helmet>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-10">
        <h1 className="text-2xl font-extrabold text-[#004F2D] mb-2">Preguntas frecuentes</h1>
        <p className="text-sm text-gray-500 mb-8">
          ¿No encuentras lo que buscas?{" "}
          <a href={WA} target="_blank" rel="noopener noreferrer" className="text-[#1D9E75] font-semibold underline">
            Escríbenos por WhatsApp
          </a>
          .
        </p>

        <div className="space-y-3 mb-10">
          {faqs.map((item) => (
            <FAQItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        <div className="bg-[#F0FAF3] border border-[#C6EDD4] rounded-2xl px-5 py-6">
          <p className="text-sm font-bold text-[#004F2D] mb-1">¿Tienes otra pregunta?</p>
          <p className="text-sm text-gray-600 mb-4">
            Escríbenos y te respondemos directamente — sin bots, sin menús.
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
