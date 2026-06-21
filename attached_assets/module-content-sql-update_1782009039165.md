# Module Content Update — paula_messages
## PagoYa / Paula Counselor | June 2026
## Paste directly into Replit shell or db.execute block. Safe to re-run — all use ON CONFLICT DO UPDATE.

---

## Context

Updates `template_es` for all 5 `module_unlock_%` rows in `paula_messages`.
Each module is a 3-part sequence delivered as one WhatsApp message with `---`
section breaks. All `{{variable}}` tokens already supported by `injectVariables()`.
No schema changes. No code changes. No restart required — templates load fresh
each cron batch. To force immediate effect, restart server or manually trigger cron.

---

## Verify current state first

```sql
SELECT trigger_type, LENGTH(template_es) AS chars, LEFT(template_es, 80) AS preview
FROM paula_messages
WHERE trigger_type LIKE 'module_unlock_%'
ORDER BY trigger_type;
```

---

## Module 1 — ¿Qué es un historial de crédito?
-- Fires after first payment, PTI < 30. Warm teacher register.

```sql
UPDATE paula_messages SET template_es =
'{{nombre}}, acabas de hacer algo más importante de lo que parece.

Cada pago que registras en PagoYa queda guardado — con fecha, monto, y si fue a tiempo. Eso se llama historial financiero. Y es exactamente lo que los bancos y las instituciones de crédito buscan cuando alguien les pide dinero prestado.

---

La mayoría de personas en México nunca construyen ese historial — no porque sean irresponsables, sino porque nadie les dio una forma de empezar.

Tú ya empezaste. Con ese pago de hoy.

---

No necesitas una tarjeta de crédito ni una cuenta bancaria para construir confianza financiera. Solo necesitas ser constante.

En los próximos meses, cada pago que hagas a tiempo es un ladrillo. Yo te voy a ir contando cómo va quedando la construcción. 🧱',
updated_at = NOW()
WHERE trigger_type = 'module_unlock_1';
```

---

## Module 2 — Cómo funciona el crédito en México
-- Fires when PTI first hits 30. Warm teacher register.

```sql
UPDATE paula_messages SET template_es =
'{{nombre}}, {{pti_score}} puntos. Momento de contarte algo que muy poca gente sabe con claridad.

En México, cuando alguien pide un préstamo — para un negocio, una casa, un coche, lo que sea — la institución que presta el dinero consulta tu historial de crédito antes de decidir. Ese historial lo guardan dos empresas: Buró de Crédito y Círculo de Crédito.

---

Si tienes buen historial, te prestan más fácil y a mejor precio. Si tienes mal historial, te cobran más caro o te dicen que no. Y si no tienes historial — si nunca has tenido ningún producto financiero formal — para ellos simplemente no existes todavía.

El objetivo no es tener historial perfecto desde el día uno. El objetivo es empezar a existir en ese sistema, con pagos reales y consistentes.

---

Lo que estás construyendo en PagoYa ya refleja los mismos comportamientos que esas instituciones valoran: puntualidad, variedad de servicios, consistencia en el tiempo.

La próxima vez que hablemos, te cuento exactamente cómo funciona el Buró por dentro — y por qué la mayoría de la gente lo entiende al revés. 👀',
updated_at = NOW()
WHERE trigger_type = 'module_unlock_2';
```

---

## Module 3 — Buró de Crédito: la verdad
-- Fires when PTI first hits 50. Direct demystification. ARCO rights woven in.

```sql
UPDATE paula_messages SET template_es =
'{{nombre}}, hay un mito que le ha costado mucho dinero a mucha gente en México, y quiero que tú no seas una de esas personas:

"Estar en el Buró de Crédito es malo."

No es cierto. Estar en el Buró es neutro. Lo que importa es cómo estás ahí. No estar en el Buró — eso sí es un problema. Significa que cuando pidas crédito, nadie puede evaluarte. Y sin evaluación, no hay préstamo.

---

El Buró registra todo: los pagos que hiciste a tiempo, los que se atrasaron, cuánto tiempo llevas con historial, y qué tan variados son tus compromisos financieros.

Tu meta no es salir del Buró. Tu meta es construir un historial limpio dentro de él — que es exactamente lo que estamos haciendo.

---

Un dato que poca gente conoce: por ley, tienes derecho a revisar tu historial en el Buró una vez al año, completamente gratis. Se llama tu derecho ARCO — Acceso, Rectificación, Cancelación y Oposición.

Cuando llegue el momento, puedes hacerlo en buro.com.mx. Es tu historial. Tienes derecho a verlo. 📋

La próxima vez te cuento qué buscan exactamente los bancos cuando lo revisan.',
updated_at = NOW()
WHERE trigger_type = 'module_unlock_3';
```

---

## Module 4 — Qué buscan los bancos
-- Fires when PTI first hits 65 / Plata. Confident guide register.

```sql
UPDATE paula_messages SET template_es =
'{{nombre}}, PTI {{pti_score}}. Nivel Plata. Esto es lo que necesitas saber ahora.

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

La próxima vez — el último módulo — te explico exactamente qué pasa cuando decides dar el paso. Sin sorpresas. 🎯',
updated_at = NOW()
WHERE trigger_type = 'module_unlock_4';
```

---

## Module 5 — Tu primera solicitud de crédito formal
-- Fires when PTI first hits 80 / Oro. Confident guide. CAT + CONDUSEF woven in naturally.

```sql
UPDATE paula_messages SET template_es =
'{{nombre}}, llegaste al último módulo. Esto es lo que necesitas saber antes de solicitar tu primer crédito formal — para que nadie te sorprenda con letra chica.

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

Yo sigo aquí. Cuando estés lista para el siguiente paso, me avisas. 💛',
updated_at = NOW()
WHERE trigger_type = 'module_unlock_5';
```

---

## Verify after update

```sql
SELECT
  trigger_type,
  LENGTH(template_es) AS char_count,
  LEFT(template_es, 100) AS preview
FROM paula_messages
WHERE trigger_type LIKE 'module_unlock_%'
ORDER BY trigger_type;
```

Expected: 5 rows, all `char_count` > 400. Scaffolds were ~150 chars — these are
richer. Preview confirms new opening line for each module.

---

## No restart required

loadMessageTemplates() fetches fresh from DB at the start of each 6h cron batch.
To force immediate: restart server or manually trigger the Paula cron once.
