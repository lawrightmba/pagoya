# PagoYa Footer — Trust & Disclosure Draft
**Status: DRAFT — requires Julio Leon legal review before implementation**
Modeled on Mercado Pago's footer pattern (negative-disclosure + comprehensive link architecture)

---

## 1. Legal Disclaimer Block
*Placement: directly above the footer link columns, full-width, smaller type, on every page*

### Draft (Spanish — primary)

> PagoYa es operada por Longview Meridian Holdings, LLC. PagoYa no es una institución financiera, no capta depósitos del público y no está autorizada por ninguna autoridad bancaria para operar como banco o institución de crédito. Los fondos asociados a tus pagos son procesados a través de instituciones de fondos de pago electrónico autorizadas por las autoridades correspondientes en México. Los saldos en tu cuenta PagoYa no constituyen un depósito bancario y no están garantizados bajo las leyes de protección a depósitos aplicables a instituciones financieras.
>
> El Puntaje de Confianza (PTI) es una herramienta informativa interna de PagoYa y no constituye, por sí mismo, una calificación crediticia oficial ni una garantía de aprobación de crédito por parte de terceros.
>
> Las marcas de los productos y servicios que puedes pagar a través de PagoYa (CFE, organismos operadores de agua, compañías telefónicas, etc.) no son propiedad de PagoYa ni de Longview Meridian Holdings, LLC, y pertenecen a sus respectivos titulares.

### Draft (English — fallback/diaspora audience)

> PagoYa is operated by Longview Meridian Holdings, LLC. PagoYa is not a financial institution, does not take public deposits, and is not authorized by any banking authority to operate as a bank or credit institution. Funds associated with your payments are processed through electronic payment fund institutions authorized by the relevant authorities in Mexico. Balances in your PagoYa account do not constitute a bank deposit and are not guaranteed under deposit-protection laws applicable to financial institutions.
>
> The Trust Score (PTI) is an internal informational tool and does not by itself constitute an official credit rating or a guarantee of third-party credit approval.
>
> Brands of the products and services payable through PagoYa (CFE, water utilities, phone carriers, etc.) are not owned by PagoYa or Longview Meridian Holdings, LLC, and belong to their respective owners.

**⚠️ Items Julio needs to confirm/correct:**
- Exact name and authorization status of the STP entity to reference (can we name STP directly, or should it stay generic — "instituciones autorizadas")
- Whether PTI language needs additional distancing from "credit score" terminology to avoid implying CNBV-regulated credit bureau status
- Whether Longview Meridian Holdings needs an RFC/Mexico registration disclosure or if the current US-entity framing is sufficient as-is

---

## 2. Footer Link Architecture
*Placement: standard 4-column footer, mirrors MP's category logic*

### Para ti
- Pagar CFE
- Pagar agua
- Recargas telefónicas
- Transferencias
- Tu Puntaje de Confianza (PTI)
- Recompensas y niveles
- Habla con Paula

### Para propietarios *(PagoSeguro cross-link)*
- Cobro de renta digital
- Únete como representante
- Panel de propietario

### Ayuda y Seguridad
- Preguntas frecuentes
- Reporté un fraude
- Creo que usan mi cuenta
- Consejos de seguridad
- Cómo presentar una queja
- Cancela tu cuenta

### Acerca de
- Términos y condiciones
- Aviso de privacidad
- Cómo usar tu cuenta de forma segura
- Cómo protegemos tus datos
- Comisiones y cargos
- Accesibilidad
- Contacto

---

## 2a. Why these two additions matter specifically for PagoYa
*(added after reviewing MP's full footer + security/complaint pages)*

- **"Cómo presentar una queja"** — MP routes this through three layers (internal help → customer advocate → government consumer protection portal). PagoYa doesn't need three layers at this stage, but having *any* visible complaint path is what matters — its absence is what reads as risky to a wary user, not the sophistication of the path itself.
- **"Cómo usar tu cuenta de forma segura"** — MP's version leans on biometrics and trusted-contact account recovery, which assumes a smartphone-native, somewhat sophisticated user. PagoYa's version needs to lean hard into **WhatsApp phishing awareness** instead, since that's the actual attack surface for your audience and channel. Drafted separately — see `pagoya-security-page-draft.md`.

---

## 3. Implementation Notes

- **Component naming suggestion:** `FooterDisclosure.tsx` (legal block) + `FooterLinks.tsx` (column nav), kept separate so legal copy can be updated independently of nav structure
- **Placement:** legal disclaimer block should render on every page (global layout), not just homepage — matches MP's pattern of disclaimer appearing sitewide
- **Fee transparency:** the "Comisiones y cargos" link should land on a simple page stating the flat $25 MXN fee plainly — no fine print, this is a trust opportunity not just a compliance box
- **"Cancela tu cuenta" link:** route to an actual self-serve flow if possible; if not built yet, route to WhatsApp support with pre-filled context, but the *link itself* needs to exist pre-signup since its presence (not just its function) is what builds trust
- **Sequencing:** legal disclaimer block → Julio review → ship before next GSC indexing checkpoint, since this is exactly the kind of page-level trust signal that affects both user conversion and AI-assistant/GEO citation quality (LLM crawlers weight transparency/disclosure content when summarizing "is this legitimate")

---

## 4. Items still needed from Mercado Pago site to round this out
If you can screenshot these, I can tighten the draft further:
- Their dedicated "Comisiones y cargos" page (fee transparency format)
- Their "Cómo usar tu cuenta de forma segura" page (security education content)
- Their "Protección al consumidor" page specifically
