export default function FooterDisclosure() {
  return (
    <div className="bg-[#F7F8F7] border-t border-gray-200 px-5 py-6">
      <p className="text-[11px] leading-relaxed text-gray-500 max-w-3xl">
        PagoYa es operada por Longview Meridian Holdings, LLC. PagoYa no es una institución
        financiera, no capta depósitos del público y no está autorizada por ninguna autoridad
        bancaria para operar como banco o institución de crédito. Los fondos asociados a tus
        pagos son procesados a través de instituciones de fondos de pago electrónico autorizadas
        por las autoridades correspondientes en México. Los saldos en tu cuenta PagoYa no
        constituyen un depósito bancario y no están garantizados bajo las leyes de protección
        de depósitos aplicables en México.
      </p>
      <p className="text-[11px] leading-relaxed text-gray-500 max-w-3xl mt-3">
        El Puntaje de Confianza (PTI) es una herramienta informativa interna de PagoYa y no
        constituye, por sí mismo, una calificación crediticia oficial ni una garantía de
        aprobación de crédito por parte de terceros.
      </p>
      <p className="text-[11px] leading-relaxed text-gray-500 max-w-3xl mt-3">
        Las marcas de los productos y servicios que puedes pagar a través de PagoYa (CFE,
        organismos operadores de agua, compañías telefónicas, etc.) no son propiedad de PagoYa
        ni de Longview Meridian Holdings, LLC, y pertenecen a sus respectivos titulares.
      </p>
      <p className="text-[11px] text-gray-400 mt-4">
        © {new Date().getFullYear()} PagoYa — Longview Meridian Holdings, LLC. Todos los derechos reservados.
      </p>
    </div>
  );
}
