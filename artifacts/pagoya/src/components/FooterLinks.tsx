import { Link } from "wouter";

const WA = "https://wa.me/14343319311";
const waLink = (msg: string) => `${WA}?text=${encodeURIComponent(msg)}`;

const columns = [
  {
    heading: "Para ti",
    links: [
      { label: "Pagar CFE", href: "/pagar-cfe" },
      { label: "Pagar agua", href: "/pagar-agua-vallarta" },
      { label: "Recargas telefónicas", href: "/recargas" },
      { label: "Transferencias", href: "/enviar" },
      { label: "Tu Puntaje de Confianza (PTI)", href: "/confianza" },
      { label: "Recompensas y niveles", href: "/puntos" },
      { label: "Habla con Paula", href: WA, external: true },
    ],
  },
  {
    heading: "Para propietarios",
    links: [
      { label: "Cobro de renta digital", href: "https://pagoseguromx.com", external: true },
      { label: "Únete como representante", href: "/rep-login" },
      { label: "Panel de propietario", href: "/rep-dashboard" },
    ],
  },
  {
    heading: "Ayuda y Seguridad",
    links: [
      { label: "Preguntas frecuentes", href: "/faq" },
      { label: "Reporté un fraude", href: "/seguridad#reportar" },
      { label: "Cómo presentar una queja", href: "/como-presentar-una-queja" },
      { label: "Consejos de seguridad", href: "/seguridad" },
      { label: "Cancela tu cuenta", href: waLink("Quiero cancelar mi cuenta de PagoYa"), external: true },
    ],
  },
  {
    heading: "Acerca de",
    links: [
      { label: "Términos y condiciones", href: "/terminos-y-condiciones" },
      { label: "Aviso de privacidad", href: "/aviso-de-privacidad" },
      { label: "Cómo usar tu cuenta de forma segura", href: "/seguridad" },
      { label: "Comisiones y cargos", href: "/comisiones-y-cargos" },
      { label: "Contacto", href: WA, external: true },
    ],
  },
];

export default function FooterLinks() {
  return (
    <div className="bg-[#F7F8F7] border-t border-gray-100 px-5 pt-7 pb-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">
        {columns.map((col) => (
          <div key={col.heading}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">
              {col.heading}
            </p>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-gray-600 hover:text-[#004F2D] transition-colors leading-tight block"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-[12px] text-gray-600 hover:text-[#004F2D] transition-colors leading-tight block"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
