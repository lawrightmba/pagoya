# PagoYa — /como-presentar-una-queja Page Draft
**Status: DRAFT — Julio to confirm whether any Mexican consumer-protection authority (e.g. PROFECO / CONDUSEF) should be referenced directly**

---

## Why this page matters
This is the single highest-leverage trust page for a skeptical new user. The presence of a clear, simple complaint path — even one with very few steps — answers the unspoken question "what happens if this goes wrong for me?" before the user has to ask it. MP's version routes through three escalating layers (internal → ombudsperson → government portal); PagoYa's version should be honest about being a single-layer process right now, without pretending to have infrastructure that doesn't exist yet.

---

## 1. Hero

### Spanish
**¿Algo no salió como esperabas?**
Aquí te explicamos cómo resolverlo.

### English
**Something didn't go as expected?**
Here's how to get it resolved.

---

## 2. Process block

### Spanish

**Paso 1 — Cuéntanos qué pasó**
Escríbenos por WhatsApp al **+1 (434) 331-9311** o usa el botón de abajo. Cuéntanos qué pasó, cuándo, y si tienes una captura de pantalla o número de confirmación, compártelo — nos ayuda a resolverlo más rápido.

**Paso 2 — Te respondemos directamente**
Un miembro de nuestro equipo revisa tu caso y te responde por el mismo canal. No tienes que esperar días ni navegar un menú telefónico.

**Paso 3 — Si no quedaste satisfecho**
Puedes pedir que tu caso sea revisado de nuevo. Si involucra el manejo de tus fondos, también tienes derecho a acudir a las autoridades de protección al consumidor correspondientes en México.

---

## 3. What you can file a complaint about (sets expectations, reduces anxiety pre-signup)

### Spanish
- Un pago que no se reflejó correctamente
- Un cargo que no reconoces
- Un problema con tu Puntaje de Confianza
- Una recompensa o pago gratis que no se aplicó
- Cualquier otra duda sobre tu cuenta

---

## 4. Closing CTA

### Spanish
**[Presentar una queja]** → routes to WhatsApp support, tagged as a complaint (not routed through Paula's standard bot flow)

---

## 5. Implementation notes

- **Route:** `/como-presentar-una-queja`
- **Routing requirement:** complaints should be tagged distinctly from regular support/Paula traffic so they get human eyes quickly — worth a dedicated tag in whatever WhatsApp routing/queue logic you're using
- **Honesty constraint:** don't imply a multi-tier escalation process (ombudsperson, etc.) that doesn't exist yet — a single clear step that actually works builds more trust than a fake-sophisticated process that doesn't
- **Linked from:** footer "Cómo presentar una queja," and consider a small link on the PaymentSuccess / transaction history screens directly ("¿Algo salió mal con este pago?")
