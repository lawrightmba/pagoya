# PagoYa — /seguridad Page Draft
**Status: DRAFT — ready for Replit implementation**
Adapted from Mercado Pago's security page pattern, re-weighted for PagoYa's actual risk surface: WhatsApp phishing, not device biometrics.

---

## Why this page is weighted differently than MP's

MP's security page assumes a sophisticated smartphone user and focuses on biometrics + trusted-contact recovery. PagoYa's audience is WhatsApp-native and often new to digital financial tools — the real threat isn't device theft, it's **someone impersonating PagoYa or Paula over WhatsApp** to extract OTPs or payment confirmations. The page should be built around that.

---

## 1. Hero

### Spanish
**Usa PagoYa con tranquilidad**
Aquí tienes todo lo que necesitas saber para mantener tu cuenta segura.

### English
**Use PagoYa with peace of mind**
Everything you need to know to keep your account safe.

---

## 2. Core sections

### Verifica que realmente eres tú quien habla con Paula
- Paula nunca te va a pedir tu contraseña ni el código que recibes por SMS.
- El número oficial de WhatsApp de PagoYa es **+1 (434) 331-9311** — guárdalo en tus contactos para reconocerlo siempre.
- Si recibes un mensaje de otro número diciendo que es PagoYa, repórtalo de inmediato.

### Nunca compartas tu código de verificación
- El código que te enviamos por SMS o WhatsApp es solo para ti.
- Ningún empleado de PagoYa, ni Paula, te lo van a pedir nunca, por ningún motivo.
- Si alguien te lo pide diciendo que es "soporte de PagoYa," es un fraude.

### Reconoce los mensajes falsos
- Desconfía de mensajes que crean urgencia ("tu cuenta será bloqueada en 1 hora").
- Desconfía de links que no terminan en pagoyamx.com.
- PagoYa nunca te pedirá que instales una aplicación fuera de las tiendas oficiales (Google Play / App Store).

### Mantén tu cuenta protegida
- Usa un código de desbloqueo en tu teléfono — no dejes tu WhatsApp accesible a otras personas.
- Si cambias de número de teléfono, avísanos de inmediato desde la app o por WhatsApp.
- Revisa tus pagos y tu Puntaje de Confianza regularmente — si ves algo que no reconoces, repórtalo.

### Presta atención a las alertas de seguridad
- Te avisamos por WhatsApp cada vez que se hace un pago desde tu cuenta.
- Si recibes una alerta de un pago que no hiciste, contáctanos de inmediato.

---

## 3. Closing CTA block

### Spanish
**¿Tienes un problema de seguridad?**
Escríbenos de inmediato por WhatsApp o usa el botón de abajo.
**[Reportar un problema de seguridad]**

### English
**Have a security concern?**
Message us immediately on WhatsApp or use the button below.
**[Report a security issue]**

---

## 4. Implementation notes

- **Route:** `/seguridad`
- **Linked from:** footer "Cómo usar tu cuenta de forma segura," plus ideally a one-time in-app nudge shown after first payment (similar to how PaymentSuccess already shows a celebration — this could be a soft second card: "Aprende a proteger tu cuenta")
- **Official WhatsApp number callout:** this needs an actual, prominently placed, repeatable reference to PagoYa's real number — consider also putting it in the bienvenida flow itself, since "save this number" is the single highest-leverage anti-phishing instruction you can give a WhatsApp-native user
- **Reporting flow:** "Reportar un problema de seguridad" should route into the same WhatsApp support channel Paula uses, but ideally tagged/routed to a human, not back into the bot flow — a user reporting fraud should never get an automated reply first
