/**
 * ONE-OFF: Step 3 of the paula_messages production data-gap fix.
 *
 * Inserts the 23 dev-export templates into paula_messages, EXCLUDING
 * readiness_hard_step2 (microcrédito partner status unresolved — see task
 * notes), and forcing active = false on every row regardless of what it was
 * set to in the dev export.
 *
 * Idempotent: relies on the paula_messages_trigger_type_key UNIQUE constraint
 * and ON CONFLICT (trigger_type) DO NOTHING, so calling this twice is a no-op
 * the second time.
 *
 * Safe to remove once Step 3 has been run once against production and
 * verified — this is a migration utility, not a long-lived feature.
 */
import { sql as drizzleSql } from "drizzle-orm";
import type { db as DbType } from "@workspace/db";

interface SeedRow {
  trigger_type: string;
  template_es: string;
  template_en: string | null;
  cooldown_days: number;
}

// Source: .agents/outputs/paula_messages_dev_export_24_active.csv
// readiness_hard_step2 (id 21 in dev) intentionally excluded.
const ROWS: SeedRow[] = [
  { trigger_type: "first_payment", cooldown_days: 9999, template_en: null, template_es:
    "{{nombre}}, hiciste tu primer pago puntual. 🎯 Así empieza un historial de confianza — un ladrillo a la vez. Tu PTI subió a {{pti_score}} puntos. Seguimos." },
  { trigger_type: "streak_5", cooldown_days: 9999, template_en: null, template_es:
    "{{nombre}}, llevas 5 pagos consecutivos a tiempo. Eso no es suerte — es un patrón. Los bancos buscan exactamente eso. Tu PTI actual: {{pti_score}}." },
  { trigger_type: "pti_cross_40", cooldown_days: 9999, template_en: null, template_es:
    "{{nombre}}, cruzaste los 40 puntos PTI. 🔵 Nivel Bronce alcanzado. Ya tienes un historial de confianza real — algo que no tenías hace {{days_streak}} días." },
  { trigger_type: "pti_cross_60", cooldown_days: 9999, template_en: null, template_es:
    "{{nombre}}, 60 puntos PTI. Estás a un tramo de Plata. Tu dimensión más fuerte ahora mismo: {{strongest_dimension}}. Sigue así." },
  { trigger_type: "pti_cross_80", cooldown_days: 9999, template_en: null, template_es:
    "{{nombre}}, nivel Oro. 🥇 PTI {{pti_score}}. Llevas {{days_streak}} días construyendo esto. En el siguiente mensaje te cuento qué se abre desde aquí." },
  { trigger_type: "milestone_90d", cooldown_days: 9999, template_en: null, template_es:
    "Tres meses, {{nombre}}. 90 días de historial activo. Eso ya es más consistencia de la que tiene la mayoría de personas que piden crédito formal por primera vez. PTI: {{pti_score}}." },
  { trigger_type: "late_payment_1", cooldown_days: 14, template_en: null, template_es:
    "Hola {{nombre}}. Tu último pago llegó tarde. Un retraso no destruye tu historial — dos seguidos sí lo afectan. ¿Quieres que te avise antes de tu próxima fecha de pago?" },
  { trigger_type: "pti_drop_7d", cooldown_days: 7, template_en: null, template_es:
    "{{nombre}}, tu PTI bajó {{pti_delta}} puntos esta semana. Tu área de mayor oportunidad ahora: {{weakest_dimension}}. Cuéntame qué pasó — a veces un ajuste pequeño cambia la trayectoria." },
  { trigger_type: "stalled_14d", cooldown_days: 7, template_en: null, template_es:
    "{{nombre}}, llevas 14 días sin movimiento en tu historial. Lo que construiste sigue ahí — pero el reloj está pausado. ¿Todo bien?" },
  { trigger_type: "pattern_late_2x", cooldown_days: 14, template_en: null, template_es:
    "{{nombre}}, noto un patrón: dos pagos tardíos en 30 días. No es un juicio — es una señal. ¿Hay una fecha del mes que funcione mejor para tus pagos? Puedo ayudarte a ajustar los recordatorios." },
  { trigger_type: "module_unlock_2", cooldown_days: 9999, template_en: null, template_es:
    `{{nombre}}, {{pti_score}} puntos. Momento de contarte algo que muy poca gente sabe con claridad.

  En México, cuando alguien pide un préstamo — para un negocio, una casa, un coche, lo que sea — la institución que presta el dinero consulta tu historial de crédito antes de decidir. Ese historial lo guardan dos empresas: Buró de Crédito y Círculo de Crédito.

  ---

  Si tienes buen historial, te prestan más fácil y a mejor precio. Si tienes mal historial, te cobran más caro o te dicen que no. Y si no tienes historial — si nunca has tenido ningún producto financiero formal — para ellos simplemente no existes todavía.

  El objetivo no es tener historial perfecto desde el día uno. El objetivo es empezar a existir en ese sistema, con pagos reales y consistentes.

  ---

  Lo que estás construyendo en PagoYa ya refleja los mismos comportamientos que esas instituciones valoran: puntualidad, variedad de servicios, consistencia en el tiempo.

  La próxima vez que hablemos, te cuento exactamente cómo funciona el Buró por dentro — y por qué la mayoría de la gente lo entiende al revés. 👀` },
  { trigger_type: "module_unlock_3", cooldown_days: 9999, template_en: null, template_es:
    `{{nombre}}, hay un mito que le ha costado mucho dinero a mucha gente en México, y quiero que tú no seas una de esas personas:

  "Estar en el Buró de Crédito es malo."

  No es cierto. Estar en el Buró es neutro. Lo que importa es cómo estás ahí. No estar en el Buró — eso sí es un problema. Significa que cuando pidas crédito, nadie puede evaluarte. Y sin evaluación, no hay préstamo.

  ---

  El Buró registra todo: los pagos que hiciste a tiempo, los que se atrasaron, cuánto tiempo llevas con historial, y qué tan variados son tus compromisos financieros.

  Tu meta no es salir del Buró. Tu meta es construir un historial limpio dentro de él — que es exactamente lo que estamos haciendo.

  ---

  Un dato que poca gente conoce: por ley, tienes derecho a revisar tu historial en el Buró una vez al año, completamente gratis. Se llama tu derecho ARCO — Acceso, Rectificación, Cancelación y Oposición.

  Cuando llegue el momento, puedes hacerlo en buro.com.mx. Es tu historial. Tienes derecho a verlo. 📋

  La próxima vez te cuento qué buscan exactamente los bancos cuando lo revisan.` },
  { trigger_type: "module_unlock_4", cooldown_days: 9999, template_en: null, template_es:
    `{{nombre}}, PTI {{pti_score}}. Nivel Plata. Esto es lo que necesitas saber ahora.

  Cuando un banco o una institución de crédito revisa tu perfil, evalúan cinco factores. En orden de importancia:

  1️⃣ Historial de pagos — ¿pagas a tiempo? Este es el más importante. Tú ya lo tienes.
  2️⃣ Cuánto debes vs. cuánto tienes disponible — no aplica todavía, pero es bueno saberlo.
  3️⃣ Tiempo de historial — llevas {{days_streak}} días. Cada día suma.

  ---

  4️⃣ Variedad de productos — ¿pagas varios tipos de servicio o solo uno? Tú tienes {{bill_category_count}} categorías. Los bancos valoran la diversidad porque muestra que manejas varios compromisos al mismo tiempo.
  5️⃣ Solicitudes de crédito recientes — cuántas veces has pedido crédito nuevo en poco tiempo. Más adelante, cuando empieces a solicitar, conviene no hacerlo en muchos lugares a la vez.

  ---

  Tu perfil actual ya cubre los factores 1, 3, y 4 con datos reales.

  Eso no es poco. La mayoría de personas que solicitan su primer crédito formal no pueden decir lo mismo.

  La próxima vez — el último módulo — te explico exactamente qué pasa cuando decides dar el paso. Sin sorpresas. 🎯` },
  { trigger_type: "module_unlock_5", cooldown_days: 9999, template_en: null, template_es:
    `{{nombre}}, llegaste al último módulo. Esto es lo que necesitas saber antes de solicitar tu primer crédito formal — para que nadie te sorprenda con letra chica.

  Cuando una institución te ofrezca un crédito, te van a mostrar una tasa de interés. Ignórala por un momento. Lo que importa es el CAT — Costo Anual Total.

  El CAT incluye la tasa más todas las comisiones y cargos adicionales. Un crédito con tasa del 3% mensual puede tener un CAT del 60% anual. Siempre compara el CAT, no la tasa.

  ---

  Dos cosas más que conviene saber antes de firmar cualquier cosa:

  Primero: no solicites crédito en muchos lugares al mismo tiempo. Cada consulta queda registrada en el Buró y demasiadas consultas seguidas afectan tu perfil.

  Segundo: empieza con montos pequeños. Un primer crédito bien pagado vale más que un crédito grande que se complica. La confianza se construye en etapas.

  ---

  Este es tu punto de partida, {{nombre}}. No el final — el principio de tu historial formal.

  Si en algún momento tienes dudas sobre un producto financiero específico, puedes consultar a CONDUSEF de forma gratuita: 55 3000-2000. Son la institución del gobierno que protege a los usuarios de servicios financieros.

  Esto es educación financiera — no es una oferta de crédito.

  Yo sigo aquí. Cuando estés listo/a para el siguiente paso, me avisas. 💛` },
  { trigger_type: "module_unlock_1", cooldown_days: 9999, template_en: null, template_es:
    `{{nombre}}, acabas de hacer algo más importante de lo que parece.

  Cada pago que registras en PagoYa queda guardado — con fecha, monto, y si fue a tiempo. Eso se llama historial financiero. Y es exactamente lo que los bancos y las instituciones de crédito buscan cuando alguien les pide dinero prestado.

  ---

  La mayoría de personas en México nunca construyen ese historial — no porque sean irresponsables, sino porque nadie les dio una forma de empezar.

  Tú ya empezaste. Con ese pago de hoy.

  ---

  No necesitas una tarjeta de crédito ni una cuenta bancaria para construir confianza financiera. Solo necesitas ser constante.

  En los próximos meses, cada pago que hagas a tiempo es un ladrillo. Yo te voy a ir contando cómo va quedando la construcción. 🧱` },
  { trigger_type: "readiness_approaching", cooldown_days: 14, template_en: null, template_es:
    `{{nombre}}, estás a punto de alcanzar algo que muy poca gente sin cuenta bancaria logra: un perfil crediticio real. 🎯

Tu avance actual:
📊 PTI {{pti_score}} / 80 necesario
📅 {{streak_days}} días consecutivos / 90 necesarios

Lo más cercano a completar: {{top_gap}}.

Sigue así — cada pago es un paso más hacia tu primer crédito formal.` },
  { trigger_type: "readiness_hard", cooldown_days: 9999, template_en: null, template_es:
    `🏆 {{nombre}}, llegaste.

  Mes tras mes, pago tras pago — construiste algo real.

  ✅ PTI {{pti_score}} — nivel excelente
  ✅ {{streak_days}} días consecutivos
  ✅ {{bill_diversity}} tipos de servicios pagados
  ✅ {{literacy_score}} módulos completados

  Tu recompensa: 5 pagos gratis + $300 MXN ya en tu billetera. Son tuyos, sin condiciones.

  Sigues siendo parte de PagoYa — esto no cambia nada de lo que ya tienes aquí.

  Con un perfil como el tuyo, algunas personas empiezan a calificar para opciones más grandes: financiamiento, seguros, cosas que antes no estaban disponibles. Paula encontró algo que podría interesarte.

  ¿Te cuento? Responde *SÍ* o *NO* — sin compromiso.` },
  { trigger_type: "not_yet_gap_report", cooldown_days: 30, template_en: null, template_es:
    `{{nombre}}, llevas {{streak_days}} días construyendo tu historial financiero desde cero. Eso no es poco.

  Para llegar al siguiente nivel, lo que más te acercaría ahora mismo es: {{top_gap}}.

  No tienes que hacer todo a la vez. Solo seguir siendo constante — un pago a la vez, una semana a la vez.

  Cuando quieras saber cómo vas en detalle, aquí estoy. 💪` },
  { trigger_type: "winback_30d", cooldown_days: 9999, template_en: null, template_es:
    "Hola {{nombre}} 👋 ¿Tienes un recibo de CFE, Telmex o agua pendiente? Te lo pago en 2 minutos desde aquí, sin filas ni efectivo. Solo dime el servicio y tu número de cuenta." },
  { trigger_type: "free_credit_nudge", cooldown_days: 7, template_en: null, template_es:
    `💳 {{nombre}}, tienes {{free_bill_credits}} pago(s) gratis esperándote.

  La próxima vez que pagues CFE, agua o cualquier servicio — la comisión desaparece automáticamente. No tienes que hacer nada extra.

  Es tuyo. Úsalo.` },
  { trigger_type: "remittance_profile", cooldown_days: 9999,
    template_es:
      `💸 *Una pregunta para tu perfil financiero:*

  ¿Recibes dinero del extranjero de forma regular? (por ejemplo de un familiar en EE.UU. u otro país)

  Responde:
  *1* — Sí, recibo remesas o envíos del extranjero
  *2* — No

  _Esta información es voluntaria y nos ayuda a mejorar tu perfil. Puedes ignorar este mensaje si prefieres._`,
    template_en:
      `💸 *Quick profile question:*

  Do you regularly receive money from abroad? (e.g. from a family member in the US or another country)

  Reply:
  *1* — Yes, I receive remittances or international transfers
  *2* — No

  _This is optional. It helps us build your financial profile. Feel free to ignore this message._` },
  { trigger_type: "employment_profile", cooldown_days: 9999,
    template_es:
      `📋 *Una pregunta para tu perfil financiero:*

  ¿Cómo describes tu situación de trabajo actual?

  Responde con el número:
  *1* — Empleo formal con contrato o nómina
  *2* — Trabajo informal o por cuenta propia
  *3* — Trabajo por proyecto / gig / freelance
  *4* — Por el momento sin empleo
  *5* — Prefiero no decir

  _Esta información es voluntaria y confidencial. Nos ayuda a conectarte con mejores opciones cuando tu perfil esté listo._`,
    template_en:
      `📋 *Quick profile question:*

  How would you describe your current work situation?

  Reply with the number:
  *1* — Formal employment with a contract
  *2* — Informal / self-employed
  *3* — Gig / project / freelance work
  *4* — Currently without work
  *5* — Prefer not to say

  _This is optional and confidential. It helps us connect you with better options when your profile is ready._` },
  { trigger_type: "address_tenure", cooldown_days: 9999,
    template_es:
      `🏠 *Última pregunta de tu perfil:*

  ¿Cuánto tiempo llevas viviendo en tu domicilio actual?

  Responde con el número:
  *1* — Menos de 6 meses
  *2* — Entre 6 meses y 2 años
  *3* — Más de 2 años

  _Esta información es voluntaria. Nos ayuda a entender mejor tu estabilidad y conectarte con opciones financieras adecuadas._`,
    template_en:
      `🏠 *Last profile question:*

  How long have you been living at your current address?

  Reply with the number:
  *1* — Less than 6 months
  *2* — Between 6 months and 2 years
  *3* — More than 2 years

  _This is optional. It helps us understand your stability and connect you with the right financial options._` },
];

export const PAULA_MESSAGES_STEP3_EXPECTED_COUNT = ROWS.length; // 23
export const PAULA_MESSAGES_STEP3_EXCLUDED_TRIGGER = "readiness_hard_step2";

export async function seedPaulaMessagesStep3(dbClient: typeof DbType): Promise<{
  attempted: number;
  inserted: number;
  skippedExisting: number;
}> {
  let inserted = 0;
  for (const row of ROWS) {
    const result = await dbClient.execute(drizzleSql`
      INSERT INTO paula_messages (trigger_type, template_es, template_en, active, cooldown_days)
      VALUES (${row.trigger_type}, ${row.template_es}, ${row.template_en}, false, ${row.cooldown_days})
      ON CONFLICT (trigger_type) DO NOTHING
      RETURNING id
    `);
    if (result.rows.length > 0) inserted += 1;
  }
  return {
    attempted: ROWS.length,
    inserted,
    skippedExisting: ROWS.length - inserted,
  };
}
