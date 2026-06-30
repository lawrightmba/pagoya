import { Helmet } from "react-helmet-async";
import { MessageCircle } from "lucide-react";
import GlobalFooter from "@/components/GlobalFooter";

const WA_COMPLAINT = "https://wa.me/14343319311?text=Quiero%20presentar%20una%20queja";

const steps = [
  {
    num: "1",
    title: "Cuéntanos qué pasó",
    body: "Escríbenos por WhatsApp al +1 (434) 331-9311 o usa el botón de abajo. Cuéntanos qué pasó, cuándo, y si tienes una captura de pantalla o número de confirmación, compártelo — nos ayuda a resolverlo más rápido.",
  },
  {
    num: "2",
    title: "Te respondemos directamente",
    body: "Un miembro de nuestro equipo revisa tu caso y te responde por el mismo canal. No tienes que esperar días ni navegar un menú telefónico.",
  },
  {
    num: "3",
    title: "Si no quedaste satisfecho",
    body: "Puedes pedir que tu caso sea revisado de nuevo. Si involucra el manejo de tus fondos, también tienes derecho a acudir a las autoridades de protección al consumidor correspondientes en México.",
  },
];

const topics = [
  "Un pago que no se reflejó correctamente",
  "Un cargo que no reconoces",
  "Un problema con tu Puntaje de Confianza",
  "Una recompensa o pago gratis que no se aplicó",
  "Cualquier otra duda sobre tu cuenta",
];

export default function ComoPresentarUnaQueja() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Helmet>
        <title>Cómo presentar una queja — PagoYa</title>
        <meta name="description" content="¿Algo no salió como esperabas? Aquí te explicamos cómo resolverlo con PagoYa." />
      </Helmet>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 py-10">
        <div className="mb-10">
          <h1 className="text-2xl font-extrabold text-[#004F2D] leading-tight mb-2">
            ¿Algo no salió como esperabas?
          </h1>
          <p className="text-gray-600 text-sm leading-relaxed">
            Aquí te explicamos cómo resolverlo.
          </p>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-5">
            Cómo funciona el proceso
          </h2>
          <div className="space-y-5">
            {steps.map((step) => (
              <div key={step.num} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#004F2D] text-white text-sm font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step.num}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800 mb-1">{step.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-4">
            Puedes presentar una queja sobre
          </h2>
          <ul className="space-y-3">
            {topics.map((topic) => (
              <li key={topic} className="flex items-start gap-3">
                <span className="text-[#1D9E75] font-bold text-sm flex-shrink-0 mt-0.5">→</span>
                <span className="text-sm text-gray-600">{topic}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#F0FAF3] border border-[#C6EDD4] rounded-2xl px-5 py-6">
          <p className="text-sm font-bold text-[#004F2D] mb-1">
            ¿Listo para presentar tu queja?
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Escríbenos y un miembro del equipo te atenderá directamente.
          </p>
          <a
            href={WA_COMPLAINT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#004F2D] text-white text-sm font-bold px-5 py-3 rounded-full"
          >
            <MessageCircle className="w-4 h-4" />
            Presentar una queja
          </a>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
