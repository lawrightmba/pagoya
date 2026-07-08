/**
 * Paula Messages Seed — versioned, idempotent upsert
 *
 * Keyed on trigger_type (unique constraint). Running this twice is a no-op.
 * Each row has an explicit `active` value matching intended production state.
 *
 * Rules for active=false:
 *   - readiness_hard: references partner handoff + cash reward ($300 MXN +
 *     5 free payments). Must stay false until partner_programs has a live partner.
 *   - readiness_hard_step2: partner-dependent microcrédito handoff step.
 *     Excluded from prod until lending partner contract is signed.
 *
 * Wire into deploy: call POST /api/admin/seed-paula-messages after each deploy.
 * The seed is idempotent — safe to re-run at any time.
 */
import { sql as drizzleSql } from "drizzle-orm";
import type { db as DbType } from "@workspace/db";

export const PAULA_MESSAGES_EXPECTED_ACTIVE = 22;
export const PAULA_MESSAGES_TOTAL_IN_SEED = 24;

// ── Twilio Content template variable schemas ───────────────────────────────────
// Maps trigger_type → positional variable index → UserContext field name.
// These values are extracted from UserContext at enqueue time and stored in
// paula_send_queue.variables_json for use by sendWhatsAppTemplate().
// Keep in sync with the approved Twilio Content template bodies listed in
// CONTENT_TEMPLATE_BODIES below.
const VARIABLES_SCHEMA: Record<string, Record<string, string>> = {
  "first_payment":          { "1": "nombre", "2": "pti_score" },
  "streak_5":               { "1": "nombre", "2": "pti_score" },
  "pti_cross_40":           { "1": "nombre", "2": "pti_score", "3": "days_streak" },
  "pti_cross_60":           { "1": "nombre", "2": "pti_score" },
  "pti_cross_80":           { "1": "nombre", "2": "pti_score", "3": "days_streak" },
  "milestone_90d":          { "1": "nombre", "2": "pti_score" },
  "late_payment_1":         { "1": "nombre" },
  "pti_drop_7d":            { "1": "nombre", "2": "weakest_dimension" },
  "stalled_14d":            { "1": "nombre" },
  "pattern_late_2x":        { "1": "nombre" },
  // Module teasers: Content template is a short ~120-char invite; {{1}} = nombre.
  // Full educational content lives in template_es and is sent freeform in-session
  // (either directly if within 24h session, or after the user replies to the teaser).
  "module_unlock_1":        { "1": "nombre" },
  "module_unlock_2":        { "1": "nombre" },
  "module_unlock_3":        { "1": "nombre" },
  "module_unlock_4":        { "1": "nombre" },
  "module_unlock_5":        { "1": "nombre" },
  "readiness_approaching":  { "1": "nombre", "2": "pti_score" },
  "readiness_hard":         { "1": "nombre", "2": "pti_score" },
  "not_yet_gap_report":     { "1": "nombre", "2": "pti_score" },
  "winback_30d":            { "1": "nombre" },
  "free_credit_nudge":      { "1": "nombre" },
  "remittance_profile":     { "1": "nombre" },
  "employment_profile":     { "1": "nombre" },
  "address_tenure":         { "1": "nombre" },
  "readiness_hard_step2":   {},
};

// ── Twilio Content template bodies (es-MX) ────────────────────────────────────
// These are the EXACT bodies to register in Twilio Messaging / Content API.
// Rules applied: fixed copy, no body starting/ending with a variable, no two
// variables adjacent, variable count kept minimal relative to text.
// Submit to Twilio → wait for Meta approval → update paula_messages.content_sid.
//
// UTILITY (≤1024 chars):
//   first_payment:
//     "¡Hiciste tu primer pago puntual, {{1}}! 🎯 Así empieza un historial de confianza financiera. Tu Índice de Confianza PagoYa subió a {{2}} puntos. ¡Seguimos construyendo!"
//   streak_5:
//     "¡Cinco pagos a tiempo, {{1}}! Eso no es suerte — es un patrón. Los bancos buscan exactamente eso. Tu Índice de Confianza PagoYa está en {{2}} puntos."
//   pti_cross_40:
//     "¡Nivel Bronce alcanzado, {{1}}! 🔵 Cruzaste los 40 puntos en tu Índice de Confianza PagoYa. Llevas {{3}} días construyendo tu historial — ahora tienes {{2}} puntos."
//   pti_cross_60:
//     "Tu Índice de Confianza PagoYa llegó a {{2}} puntos, {{1}}. 📈 Estás a un paso del nivel Plata — muy pocos usuarios llegan aquí. Sigue pagando puntualmente."
//   pti_cross_80:
//     "¡Nivel Oro alcanzado, {{1}}! 🥇 Tu Índice de Confianza PagoYa llegó a {{2}} puntos. Llevas {{3}} días construyendo esto — en el siguiente mensaje te contamos qué se abre."
//   milestone_90d:
//     "Tres meses con PagoYa, {{1}}. Tu Índice de Confianza está en {{2}} puntos — más consistencia de la que tiene la mayoría al pedir crédito formal por primera vez. ¡Buen trabajo!"
//   late_payment_1:
//     "Hola {{1}}, tu último pago llegó tarde. Un retraso no destruye tu historial — dos seguidos sí lo afectan. Escribe "pagar" y te ayudamos antes de que afecte tu Índice de Confianza PagoYa."
//   pti_drop_7d:
//     "Hola {{1}}, tu Índice de Confianza PagoYa bajó esta semana. Tu área de mayor oportunidad ahora es {{2}}. Escríbenos y revisamos juntos qué pequeño ajuste puede cambiar la tendencia."
//   stalled_14d:
//     "Hola {{1}}, llevas más de dos semanas sin movimiento en tu historial PagoYa. Lo que construiste sigue ahí — pero el reloj está pausado. Escribe "pagar" para retomar tu progreso."
//   pattern_late_2x:
//     "Hola {{1}}, notamos dos pagos tardíos recientes en tu historial PagoYa. Tu historial lo resiste — pero un tercer retraso sí lo afecta. Escríbenos y configuramos un recordatorio de pago."
//   module_unlock_1 (teaser — full text sent in-session after user replies "1"):
//     "Tu primer módulo de educación financiera está listo, {{1}}. Tarda menos de 3 minutos. Responde con *1* para recibirlo ahora."
//   module_unlock_2 (teaser):
//     "Tu Módulo 2 de Paula está disponible, {{1}}: Ahorro e Ingresos. Responde con *2* para recibirlo — tarda menos de 3 minutos."
//   module_unlock_3 (teaser):
//     "Tu Módulo 3 de Paula está listo, {{1}}: Crédito y Deuda. Responde con *3* para comenzar tu siguiente lección."
//   module_unlock_4 (teaser):
//     "Tu Módulo 4 de Paula está disponible, {{1}}: Presupuesto Familiar. Responde con *4* para recibirlo."
//   module_unlock_5 (teaser):
//     "Tu Módulo 5 de Paula está aquí, {{1}}: Planificación a Futuro. Responde con *5* para completar tu educación financiera."
//   readiness_approaching:
//     "Muy buen trabajo, {{1}}. Tu Índice de Confianza PagoYa llegó a {{2}} puntos — estás cerca del umbral para acceder a productos financieros formales. Sigue pagando puntualmente."
//   not_yet_gap_report:
//     "Hola {{1}}, tu Índice de Confianza PagoYa está en {{2}} puntos. Para llegar al siguiente nivel, los pagos puntuales y constantes son lo que más suma. ¡Tú puedes llegar!"
//   remittance_profile:
//     "Hola {{1}}, una pregunta para tu perfil financiero (opcional): ¿recibes dinero del extranjero de forma regular? Responde *1* si es Sí, o *2* si es No. Tu respuesta es confidencial."
//   employment_profile:
//     "Hola {{1}}, una pregunta rápida para tu perfil (opcional): ¿cuál es tu situación laboral? Escribe *opciones* para ver la lista y responde con el número. Información confidencial."
//   address_tenure:
//     "Hola {{1}}, última pregunta de tu perfil (opcional): ¿cuántos años llevas en tu domicilio actual? Responde *1* (menos de 6 meses), *2* (6m–2 años), o *3* (más de 2 años)."
//   winback_30d:
//     "¡Hola de nuevo, {{1}}! Hace más de 30 días que no registras un pago en PagoYa. Tu cuenta sigue activa — vuelve hoy y tu historial retoma desde donde lo dejaste."
//
// MARKETING (≤768 chars):
//   free_credit_nudge:
//     "¡Hola {{1}}! 🎁 Tienes $150 MXN de saldo de bienvenida en PagoYa para pagar servicios del hogar: CFE, agua, gas, Telmex y más. ¡Úsalo antes de que expire! Escribe "pagar" para comenzar."
export const CONTENT_TEMPLATE_BODIES = "See JSDoc comment above for all 22 approved template bodies.";

interface SeedRow {
  trigger_type: string;
  template_es: string;
  template_en: string | null;
  cooldown_days: number;
  active: boolean;
}

const ROWS: SeedRow[] = [
  // ── Achievement ──────────────────────────────────────────────────────────────
  {
    trigger_type: "first_payment", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: "{{nombre}}, hiciste tu primer pago puntual. 🎯 Así empieza un historial de confianza — un ladrillo a la vez. Tu PTI subió a {{pti_score}} puntos. Seguimos.",
  },
  {
    trigger_type: "streak_5", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: "{{nombre}}, llevas 5 pagos consecutivos a tiempo. Eso no es suerte — es un patrón. Los bancos buscan exactamente eso. Tu PTI actual: {{pti_score}}.",
  },
  {
    trigger_type: "pti_cross_40", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: "{{nombre}}, cruzaste los 40 puntos PTI. 🔵 Nivel Bronce alcanzado. Ya tienes un historial de confianza real — algo que no tenías hace {{days_streak}} días.",
  },
  {
    trigger_type: "pti_cross_60", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: "{{nombre}}, 60 puntos PTI. Estás a un tramo de Plata. Tu dimensión más fuerte ahora mismo: {{strongest_dimension}}. Sigue así.",
  },
  {
    trigger_type: "pti_cross_80", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: "{{nombre}}, nivel Oro. 🥇 PTI {{pti_score}}. Llevas {{days_streak}} días construyendo esto. En el siguiente mensaje te cuento qué se abre desde aquí.",
  },
  {
    trigger_type: "milestone_90d", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: "Tres meses, {{nombre}}. 90 días de historial activo. Eso ya es más consistencia de la que tiene la mayoría de personas que piden crédito formal por primera vez. PTI: {{pti_score}}.",
  },

  // ── Recovery ─────────────────────────────────────────────────────────────────
  {
    trigger_type: "late_payment_1", active: true, cooldown_days: 14,
    template_en: null,
    template_es: "Hola {{nombre}}. Tu último pago llegó tarde. Un retraso no destruye tu historial — dos seguidos sí lo afectan. ¿Quieres que te avise antes de tu próxima fecha de pago?",
  },
  {
    trigger_type: "pti_drop_7d", active: true, cooldown_days: 7,
    template_en: null,
    template_es: "{{nombre}}, tu PTI bajó {{pti_delta}} puntos esta semana. Tu área de mayor oportunidad ahora: {{weakest_dimension}}. Cuéntame qué pasó — a veces un ajuste pequeño cambia la trayectoria.",
  },
  {
    trigger_type: "stalled_14d", active: true, cooldown_days: 7,
    template_en: null,
    template_es: "{{nombre}}, llevas 14 días sin movimiento en tu historial. Lo que construiste sigue ahí — pero el reloj está pausado. ¿Todo bien?",
  },
  {
    trigger_type: "pattern_late_2x", active: true, cooldown_days: 14,
    template_en: null,
    template_es: "{{nombre}}, noto un patrón: dos pagos tardíos en 30 días. No es un juicio — es una señal. ¿Hay una fecha del mes que funcione mejor para tus pagos? Puedo ayudarte a ajustar los recordatorios.",
  },

  // ── Educational — Literacy modules ───────────────────────────────────────────
  {
    trigger_type: "module_unlock_1", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: `{{nombre}}, acabas de hacer algo más importante de lo que parece.

Cada pago que registras en PagoYa queda guardado — con fecha, monto, y si fue a tiempo. Eso se llama historial financiero. Y es exactamente lo que los bancos y las instituciones de crédito buscan cuando alguien les pide dinero prestado.

---

La mayoría de personas en México nunca construyen ese historial — no porque sean irresponsables, sino porque nadie les dio una forma de empezar.

Tú ya empezaste. Con ese pago de hoy.

---

No necesitas una tarjeta de crédito ni una cuenta bancaria para construir confianza financiera. Solo necesitas ser constante.

En los próximos meses, cada pago que hagas a tiempo es un ladrillo. Yo te voy a ir contando cómo va quedando la construcción. 🧱`,
  },
  {
    trigger_type: "module_unlock_2", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: `{{nombre}}, {{pti_score}} puntos. Momento de contarte algo que muy poca gente sabe con claridad.

En México, cuando alguien pide un préstamo — para un negocio, una casa, un coche, lo que sea — la institución que presta el dinero consulta tu historial de crédito antes de decidir. Ese historial lo guardan dos empresas: Buró de Crédito y Círculo de Crédito.

---

Si tienes buen historial, te prestan más fácil y a mejor precio. Si tienes mal historial, te cobran más caro o te dicen que no. Y si no tienes historial — si nunca has tenido ningún producto financiero formal — para ellos simplemente no existes todavía.

El objetivo no es tener historial perfecto desde el día uno. El objetivo es empezar a existir en ese sistema, con pagos reales y consistentes.

---

Lo que estás construyendo en PagoYa ya refleja los mismos comportamientos que esas instituciones valoran: puntualidad, variedad de servicios, consistencia en el tiempo.

La próxima vez que hablemos, te cuento exactamente cómo funciona el Buró por dentro — y por qué la mayoría de la gente lo entiende al revés. 👀`,
  },
  {
    trigger_type: "module_unlock_3", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: `{{nombre}}, hay un mito que le ha costado mucho dinero a mucha gente en México, y quiero que tú no seas una de esas personas:

"Estar en el Buró de Crédito es malo."

No es cierto. Estar en el Buró es neutro. Lo que importa es cómo estás ahí. No estar en el Buró — eso sí es un problema. Significa que cuando pidas crédito, nadie puede evaluarte. Y sin evaluación, no hay préstamo.

---

El Buró registra todo: los pagos que hiciste a tiempo, los que se atrasaron, cuánto tiempo llevas con historial, y qué tan variados son tus compromisos financieros.

Tu meta no es salir del Buró. Tu meta es construir un historial limpio dentro de él — que es exactamente lo que estamos haciendo.

---

Un dato que poca gente conoce: por ley, tienes derecho a revisar tu historial en el Buró una vez al año, completamente gratis. Se llama tu derecho ARCO — Acceso, Rectificación, Cancelación y Oposición.

Cuando llegue el momento, puedes hacerlo en buro.com.mx. Es tu historial. Tienes derecho a verlo. 📋

La próxima vez te cuento qué buscan exactamente los bancos cuando lo revisan.`,
  },
  {
    trigger_type: "module_unlock_4", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: `{{nombre}}, PTI {{pti_score}}. Nivel Plata. Esto es lo que necesitas saber ahora.

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

La próxima vez — el último módulo — te explico exactamente qué pasa cuando decides dar el paso. Sin sorpresas. 🎯`,
  },
  {
    trigger_type: "module_unlock_5", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: `{{nombre}}, llegaste al último módulo. Esto es lo que necesitas saber antes de solicitar tu primer crédito formal — para que nadie te sorprenda con letra chica.

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

Yo sigo aquí. Cuando estés listo/a para el siguiente paso, me avisas. 💛`,
  },

  // ── Readiness gate ────────────────────────────────────────────────────────────
  {
    trigger_type: "readiness_approaching", active: true, cooldown_days: 14,
    template_en: null,
    template_es: `{{nombre}}, estás a punto de alcanzar algo que muy poca gente sin cuenta bancaria logra: un perfil crediticio real. 🎯

Tu avance actual:
📊 PTI {{pti_score}} / 80 necesario
📅 {{streak_days}} días consecutivos / 90 necesarios

Lo más cercano a completar: {{top_gap}}.

Sigue así — cada pago es un paso más hacia tu primer crédito formal.`,
  },
  {
    // active=false: references partner handoff ("Paula encontró algo que podría
    // interesarte") and a cash reward ($300 MXN + 5 free payments).
    // Must remain false until partner_programs has a live, contracted lending partner.
    trigger_type: "readiness_hard", active: false, cooldown_days: 9999,
    template_en: null,
    template_es: `🏆 {{nombre}}, llegaste.

  Mes tras mes, pago tras pago — construiste algo real.

  ✅ PTI {{pti_score}} — nivel excelente
  ✅ {{streak_days}} días consecutivos
  ✅ {{bill_diversity}} tipos de servicios pagados
  ✅ {{literacy_score}} módulos completados

  Tu recompensa: 5 pagos gratis + $300 MXN ya en tu billetera. Son tuyos, sin condiciones.

  Sigues siendo parte de PagoYa — esto no cambia nada de lo que ya tienes aquí.

  Con un perfil como el tuyo, algunas personas empiezan a calificar para opciones más grandes: financiamiento, seguros, cosas que antes no estaban disponibles. Paula encontró algo que podría interesarte.

  ¿Te cuento? Responde *SÍ* o *NO* — sin compromiso.`,
  },
  {
    trigger_type: "not_yet_gap_report", active: true, cooldown_days: 30,
    template_en: null,
    template_es: `{{nombre}}, llevas {{streak_days}} días construyendo tu historial financiero desde cero. Eso no es poco.

  Para llegar al siguiente nivel, lo que más te acercaría ahora mismo es: {{top_gap}}.

  No tienes que hacer todo a la vez. Solo seguir siendo constante — un pago a la vez, una semana a la vez.

  Cuando quieras saber cómo vas en detalle, aquí estoy. 💪`,
  },

  // ── Re-engagement ─────────────────────────────────────────────────────────────
  {
    trigger_type: "winback_30d", active: true, cooldown_days: 9999,
    template_en: null,
    template_es: "Hola {{nombre}} 👋 ¿Tienes un recibo de CFE, Telmex o agua pendiente? Te lo pago en 2 minutos desde aquí, sin filas ni efectivo. Solo dime el servicio y tu número de cuenta.",
  },

  // ── Reward nudge ──────────────────────────────────────────────────────────────
  {
    trigger_type: "free_credit_nudge", active: true, cooldown_days: 7,
    template_en: null,
    // NOTE: $150 MXN hardcoded. Amount is fixed in DB (signup_bonus_config.bonus_amount).
    // Any change to the bonus amount requires a new Twilio Content template approval cycle.
    template_es: `💳 {{nombre}}, tienes {{free_bill_credits}} pago(s) gratis esperándote.

  La próxima vez que pagues CFE, agua o cualquier servicio — la comisión desaparece automáticamente. No tienes que hacer nada extra.

  Es tuyo. Úsalo.`,
  },

  // ── Enrichment profile questions (deferred from Module 1) ────────────────────
  {
    trigger_type: "remittance_profile", active: true, cooldown_days: 9999,
    template_es: `💸 *Una pregunta para tu perfil financiero:*

  ¿Recibes dinero del extranjero de forma regular? (por ejemplo de un familiar en EE.UU. u otro país)

  Responde:
  *1* — Sí, recibo remesas o envíos del extranjero
  *2* — No

  _Esta información es voluntaria y nos ayuda a mejorar tu perfil. Puedes ignorar este mensaje si prefieres._`,
    template_en: `💸 *Quick profile question:*

  Do you regularly receive money from abroad? (e.g. from a family member in the US or another country)

  Reply:
  *1* — Yes, I receive remittances or international transfers
  *2* — No

  _This is optional. It helps us build your financial profile. Feel free to ignore this message._`,
  },
  {
    trigger_type: "employment_profile", active: true, cooldown_days: 9999,
    template_es: `📋 *Una pregunta para tu perfil financiero:*

  ¿Cómo describes tu situación de trabajo actual?

  Responde con el número:
  *1* — Empleo formal con contrato o nómina
  *2* — Trabajo informal o por cuenta propia
  *3* — Trabajo por proyecto / gig / freelance
  *4* — Por el momento sin empleo
  *5* — Prefiero no decir

  _Esta información es voluntaria y confidencial. Nos ayuda a conectarte con mejores opciones cuando tu perfil esté listo._`,
    template_en: `📋 *Quick profile question:*

  How would you describe your current work situation?

  Reply with the number:
  *1* — Formal employment with a contract
  *2* — Informal / self-employed
  *3* — Gig / project / freelance work
  *4* — Currently without work
  *5* — Prefer not to say

  _This is optional and confidential. It helps us connect you with better options when your profile is ready._`,
  },
  {
    trigger_type: "address_tenure", active: true, cooldown_days: 9999,
    template_es: `🏠 *Última pregunta de tu perfil:*

  ¿Cuánto tiempo llevas viviendo en tu domicilio actual?

  Responde con el número:
  *1* — Menos de 6 meses
  *2* — Entre 6 meses y 2 años
  *3* — Más de 2 años

  _Esta información es voluntaria. Nos ayuda a entender mejor tu estabilidad y conectarte con opciones financieras adecuadas._`,
    template_en: `🏠 *Last profile question:*

  How long have you been living at your current address?

  Reply with the number:
  *1* — Less than 6 months
  *2* — Between 6 months and 2 years
  *3* — More than 2 years

  _This is optional. It helps us understand your stability and connect you with the right financial options._`,
  },

  // ── Partner-dependent — active=false until lending partner contract is signed ─
  {
    // active=false: microcrédito partner handoff step 2.
    // Depends on a live entry in partner_programs — keep false until partner is contracted.
    trigger_type: "readiness_hard_step2", active: false, cooldown_days: 0,
    template_en: null,
    template_es: "",
  },
];

export async function seedPaulaMessages(dbClient: typeof DbType): Promise<{
  attempted: number;
  upserted: number;
  unchanged: number;
  lastSeedAt: string;
}> {
  let upserted = 0;
  const now = new Date().toISOString();

  for (const row of ROWS) {
    const schema = VARIABLES_SCHEMA[row.trigger_type] ?? {};
    const schemaStr = JSON.stringify(schema);
    const result = await dbClient.execute(drizzleSql`
      INSERT INTO paula_messages (trigger_type, template_es, template_en, active, cooldown_days, variables_schema)
      VALUES (${row.trigger_type}, ${row.template_es}, ${row.template_en ?? null}, ${row.active}, ${row.cooldown_days},
              ${schemaStr}::jsonb)
      ON CONFLICT (trigger_type) DO UPDATE
        SET template_es      = EXCLUDED.template_es,
            template_en      = EXCLUDED.template_en,
            active           = EXCLUDED.active,
            cooldown_days    = EXCLUDED.cooldown_days,
            variables_schema = EXCLUDED.variables_schema
      RETURNING (xmax = 0) AS was_inserted
    `);
    const row0 = result.rows[0] as Record<string, unknown> | undefined;
    if (row0) upserted += 1;
  }

  return {
    attempted: ROWS.length,
    upserted,
    unchanged: ROWS.length - upserted,
    lastSeedAt: now,
  };
}
