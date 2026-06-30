## Replit Agent Prompt — Trust & Disclosure Pages

PRE-FLIGHT (run first, before writing any code):
1. SELECT column_name FROM information_schema.columns WHERE table_name = 'wallet_transactions';
2. SELECT column_name FROM information_schema.columns WHERE table_name = 'bill_payments';
3. Confirm whether the $25 MXN fee is a single hardcoded constant or varies by service (CFE vs. agua vs. recargas). Report back what you find before proceeding — if fees vary by service, flag it and pause; do not build the fees page until this is confirmed, since the page's core claim depends on it.
4. Locate the existing global footer component (if one exists) and the existing layout wrapper used across pages.

DO NOT edit api-server/public/. All site files go through artifacts/pagoya/public/ per the established symlink pattern.

---

### Task 1 — Global Footer

Build/update a global footer rendered on every page, with two parts:

**A. Legal disclaimer block** (full-width, smaller type, above the link columns):

> PagoYa es operada por Longview Meridian Holdings, LLC. PagoYa no es una institución financiera, no capta depósitos del público y no está autorizada por ninguna autoridad bancaria para operar como banco o institución de crédito. Los fondos asociados a tus pagos son procesados a través de instituciones de fondos de pago electrónico autorizadas por las autoridades correspondientes en México. Los saldos en tu cuenta PagoYa no constituyen un depósito bancario y no están garantizados bajo las leyes de protección a depósitos aplicables a instituciones financieras.
>
> El Puntaje de Confianza (PTI) es una herramienta informativa interna de PagoYa y no constituye, por sí mismo, una calificación crediticia oficial ni una garantía de aprobación de crédito por parte de terceros.
>
> Las marcas de los productos y servicios que puedes pagar a través de PagoYa (CFE, organismos operadores de agua, compañías telefónicas, etc.) no son propiedad de PagoYa ni de Longview Meridian Holdings, LLC, y pertenecen a sus respectivos titulares.

**B. Footer link columns** (4 columns):

*Para ti*
- Pagar CFE → /
- Pagar agua → /
- Recargas telefónicas → /
- Transferencias → /
- Tu Puntaje de Confianza (PTI) → /
- Recompensas y niveles → /
- Habla con Paula → WhatsApp link to +1 (434) 331-9311

*Para propietarios*
- Cobro de renta digital → pagoseguromx.com
- Únete como representante → /rep-signup
- Panel de propietario → /rep-login

*Ayuda y Seguridad*
- Preguntas frecuentes → /faq (create stub if not present)
- Reporté un fraude → /seguridad (anchor to reporting section)
- Cómo presentar una queja → /como-presentar-una-queja
- Consejos de seguridad → /seguridad
- Cancela tu cuenta → WhatsApp link to +1 (434) 331-9311

*Acerca de*
- Términos y condiciones → /terminos (create stub if not present)
- Aviso de privacidad → /privacidad (create stub if not present)
- Cómo usar tu cuenta de forma segura → /seguridad
- Comisiones y cargos → /comisiones-y-cargos
- Contacto → WhatsApp link to +1 (434) 331-9311

Component naming: separate `FooterDisclosure.tsx` (legal block) from `FooterLinks.tsx` (nav), so legal copy can be updated independently.

---

### Task 2 — Fees Page (/comisiones-y-cargos)

Build a new page at route `/comisiones-y-cargos`.

Pull the fee value from the existing fee constant identified in pre-flight — do not hardcode $25 MXN separately from the value used at checkout.

**Content:**

Hero:
> **Una sola comisión. Sin sorpresas.**
> Así de simple: pagas tu servicio, pagamos $25 MXN de comisión por transacción. Nada más.

Fee table:

| Servicio | Comisión |
|---|---|
| Pago de CFE | $25 MXN |
| Pago de agua | $25 MXN |
| Recargas telefónicas | $25 MXN |
| Bono de bienvenida ($150 MXN) | Sin costo |
| Pagos gratis por nivel (Bronce, Plata, Oro, Élite) | Sin costo |

"Lo que nunca vas a pagar" block:
- ❌ Sin cuota mensual
- ❌ Sin penalización por no usar la cuenta
- ❌ Sin cargo por cancelar
- ❌ Sin comisión escondida en el tipo de cambio o en el monto del servicio
- ❌ Sin contrato de permanencia

Closing CTA:
> **¿Tienes dudas sobre algún cargo en tu cuenta?** Escríbenos por WhatsApp y te respondemos en minutos, no en días.
> [Hablar con soporte] → WhatsApp link to +1 (434) 331-9311

---

### Task 3 — Security Page (/seguridad)

Build a new page at route `/seguridad`.

Hero:
> **Usa PagoYa con tranquilidad**
> Aquí tienes todo lo que necesitas saber para mantener tu cuenta segura.

Sections (use accordion or stacked cards):

**Verifica que realmente eres tú quien habla con Paula**
- Paula nunca te va a pedir tu contraseña ni el código que recibes por SMS.
- El número oficial de WhatsApp de PagoYa es **+1 (434) 331-9311** — guárdalo en tus contactos para reconocerlo siempre.
- Si recibes un mensaje de otro número diciendo que es PagoYa, repórtalo de inmediato.

**Nunca compartas tu código de verificación**
- El código que te enviamos por SMS o WhatsApp es solo para ti.
- Ningún empleado de PagoYa, ni Paula, te lo van a pedir nunca, por ningún motivo.
- Si alguien te lo pide diciendo que es "soporte de PagoYa," es un fraude.

**Reconoce los mensajes falsos**
- Desconfía de mensajes que crean urgencia ("tu cuenta será bloqueada en 1 hora").
- Desconfía de links que no terminan en pagoyamx.com.
- PagoYa nunca te pedirá que instales una aplicación fuera de Google Play / App Store.

**Mantén tu cuenta protegida**
- Usa un código de desbloqueo en tu teléfono.
- Si cambias de número de teléfono, avísanos de inmediato.
- Revisa tus pagos y tu Puntaje de Confianza regularmente.

**Presta atención a las alertas de seguridad**
- Te avisamos por WhatsApp cada vez que se hace un pago desde tu cuenta.
- Si recibes una alerta de un pago que no hiciste, contáctanos de inmediato.

Closing CTA (anchor id="reportar"):
> **¿Tienes un problema de seguridad?**
> Escríbenos de inmediato por WhatsApp o usa el botón de abajo.
> [Reportar un problema de seguridad] → WhatsApp link to +1 (434) 331-9311, pre-filled message "Tengo un problema de seguridad con mi cuenta" if URL pre-fill is supported

---

### Task 4 — Complaint Page (/como-presentar-una-queja)

Build a new page at route `/como-presentar-una-queja`.

Hero:
> **¿Algo no salió como esperabas?**
> Aquí te explicamos cómo resolverlo.

Process block:

**Paso 1 — Cuéntanos qué pasó**
Escríbenos por WhatsApp al **+1 (434) 331-9311** o usa el botón de abajo. Cuéntanos qué pasó, cuándo, y si tienes una captura de pantalla o número de confirmación, compártelo — nos ayuda a resolverlo más rápido.

**Paso 2 — Te respondemos directamente**
Un miembro de nuestro equipo revisa tu caso y te responde por el mismo canal. No tienes que esperar días ni navegar un menú telefónico.

**Paso 3 — Si no quedaste satisfecho**
Puedes pedir que tu caso sea revisado de nuevo. Si involucra el manejo de tus fondos, también tienes derecho a acudir a las autoridades de protección al consumidor correspondientes en México.

(Keep this generic — do not name a specific authority, per legal review.)

"Puedes presentar una queja sobre" block:
- Un pago que no se reflejó correctamente
- Un cargo que no reconoces
- Un problema con tu Puntaje de Confianza
- Una recompensa o pago gratis que no se aplicó
- Cualquier otra duda sobre tu cuenta

Closing CTA:
> [Presentar una queja] → WhatsApp link to +1 (434) 331-9311, pre-filled message "Quiero presentar una queja" if URL pre-fill is supported

---

### Task 5 — Cross-links

- On PaymentSuccess screen: add a small text link "¿Algo salió mal con este pago?" → /como-presentar-una-queja
- On Bienvenida flow: add the official WhatsApp number as a visible, save-to-contacts prompt
- Sync Latest via command center after deployment, per standard workflow

---

### Final report requested

After implementation, report back:
1. Whether the $25 MXN fee constant was shared correctly across checkout and the new fees page
2. Final list of routes created
3. Any stub pages created (faq, terminos, privacidad) that still need real content
