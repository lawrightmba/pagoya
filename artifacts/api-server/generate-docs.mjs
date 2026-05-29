import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, convertInchesToTwip,
} from "docx";
import { writeFileSync } from "fs";

const PURPLE = "6B21A8";
const LIGHT_PURPLE = "F3E8FF";
const DARK = "1F2937";
const GRAY = "6B7280";
const WHITE = "FFFFFF";

function heading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 120 },
    run: { color: PURPLE, bold: true, size: 28 },
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    children: [new TextRun({ text, color: PURPLE, bold: true, size: 24 })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 60 },
    children: [new TextRun({ text, color: DARK, bold: true, size: 22 })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 276 },
    children: [new TextRun({ text, color: DARK, size: 20, ...opts })],
  });
}

function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, color: DARK, size: 20 })],
  });
}

function spacer() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [new TextRun("")] });
}

function makeTable(headers, rows, colWidths) {
  const borderNone = {
    style: BorderStyle.NONE, size: 0, color: "FFFFFF",
  };
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: colWidths[i], type: WidthType.PERCENTAGE },
        shading: { fill: PURPLE, type: ShadingType.CLEAR, color: WHITE },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: [new TextRun({ text: h, bold: true, color: WHITE, size: 18 })],
        })],
      }),
    ),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      children: row.map((cell, ci) =>
        new TableCell({
          width: { size: colWidths[ci], type: WidthType.PERCENTAGE },
          shading: { fill: ri % 2 === 0 ? WHITE : "FAF5FF", type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, color: DARK, size: 18 })],
          })],
        }),
      ),
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  });
}

// ─── TECHNICAL SUMMARY ─────────────────────────────────────────────────────────

const techDoc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", color: DARK },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.25),
          right: convertInchesToTwip(1.25),
        },
      },
    },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: "PagoYa — Technical Summary for Y Combinator", bold: true, size: 36, color: PURPLE })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: "pagoyamx.com  |  pagoseguromx.com", size: 20, color: GRAY })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: "Longview Meridian Technologies LLC  |  Built entirely without an external dev team using AI-assisted development (Claude + Replit)", size: 18, color: GRAY, italics: true })],
      }),

      heading1("1. Core Technology Stack"),
      makeTable(
        ["Layer", "Technology", "Notes"],
        [
          ["Runtime", "Node.js / Express 5", "TypeScript throughout"],
          ["ORM / DB", "Drizzle ORM + PostgreSQL (Neon)", "Atomic transactions, schema migrations"],
          ["Frontend", "React + Vite", "Mobile-first, PWA-ready"],
          ["AI Layer", "Anthropic Claude (claude-sonnet-4-5)", "Tool-use agent loop, 7-tool set"],
          ["Messaging", "Twilio WhatsApp Business API", "Inbound + outbound, receipts, OTP, agent webhook"],
          ["Bill Pay Rails", "SIPREL (primary) + Evoluciona Movil (fallback)", "Auto-failover, 20+ billers"],
          ["Card Processing", "Conekta", "Tokenization, saved cards, webhooks"],
          ["Cash-In", "Digital Femsa / OXXO", "Barcode voucher generation"],
          ["Bank Transfers", "SPEI inbound", "Webhook-verified, wallet credit"],
          ["KYC", "RENAPO CURP verification + Belvo", "Nivel 2 wallet limits"],
          ["Auth", "JWT + bcrypt", "Per-user session, rep auth separate"],
          ["Deployment", "Replit Reserved VM", "Custom domain TLS, always-on"],
          ["Analytics", "GA4 + PostHog", "Conversion funnels, event tracking"],
          ["Email CRM", "HubSpot + Brevo", "Broker outreach sequences"],
        ],
        [20, 40, 40],
      ),

      spacer(),
      heading1("2. Agentic AI — Paula"),
      body("Paula is a Claude-powered AI agent (claude-sonnet-4-5) running a tool-use loop across two simultaneous channels: WhatsApp (inbound) and an in-app floating widget on every product page. She is not a chatbot — she takes real actions against live user data and personalizes every response using the user's WhatsApp display name."),
      spacer(),
      heading3("Tool Set (live today)"),
      makeTable(
        ["Tool", "What It Does"],
        [
          ["get_wallet_balance", "Returns exact MXN balance in real time from the wallets table"],
          ["get_payment_history", "Retrieves and narrates recent transactions in natural Spanish"],
          ["get_pending_oxxo", "Checks if a cash deposit voucher is still pending confirmation"],
          ["get_loyalty_points", "Returns current points balance, lifetime total, tier (Bronce/Plata/Oro), and points to next tier"],
          ["get_deposit_instructions", "Returns step-by-step funding instructions for OXXO, SPEI, or card — whichever the user asks about"],
          ["prepare_bill_payment", "Validates service + reference + balance, stages payment with fee-inclusive summary for 2FA confirmation"],
          ["escalate_to_support", "Hands off to human agent via WhatsApp with full conversation context"],
        ],
        [30, 70],
      ),
      spacer(),
      heading3("Deployment Architecture"),
      bullet("WhatsApp inbound: any message to the PagoYa number routes through the Paula agent loop. Paula greets users by their WhatsApp display name on first contact. First-contact messages screened for rep referral codes before entering the agent flow."),
      bullet("In-app widget: persists across every screen with localStorage session memory, typing indicator, escalation banner."),
      bullet("Post-payment hook: after every successful payment the app auto-opens Paula's chat after 4 seconds with pre-filled payment context — turns a receipt into a retention event."),
      bullet("AI bill autofill: home screen natural-language input parses 'CFE 350 pesos' and pre-fills service, amount, and reference in one shot via Claude."),
      spacer(),
      heading3("Contextual Paula Hints (live as of May 2026)"),
      body("Paula surfaces inline at 6 high-friction points across the product — not as a chat prompt, but as a contextual nudge that pre-loads her with the exact question the user is most likely stuck on. One tap opens the full agent conversation."),
      bullet("Registration — CURP field: \"¿No sabes tu CURP? Paula puede ayudarte a encontrarla.\""),
      bullet("OTP screen: Troubleshooting prompt triggered after a failed or expired code — Paula walks the user through resend and WhatsApp delivery issues."),
      bullet("Payment form — reference number field: \"¿Dónde encuentro mi número de referencia?\" — pre-loaded with biller context so Paula can give a biller-specific answer."),
      bullet("Payment review screen — fee line: \"¿Por qué hay una comisión de $25 MXN?\" — Paula explains the fee and positions it against the cost of a trip to OXXO."),
      bullet("Cash load screen — OXXO deposit: Step-by-step OXXO deposit guidance — how to show the barcode, how long confirmation takes, what to do if the deposit doesn't reflect."),
      body("Each hint is a single tap that pre-loads Paula's context — users never have to describe their situation from scratch. This pattern reduces support escalations at the exact moments users are most likely to abandon."),

      spacer(),
      heading1("3. Payment Infrastructure"),
      heading3("Wallet Architecture"),
      body("Every user has a wallets row linked by phone. All debits and credits are atomic DB transactions — a bill payment deducts the wallet and records the transaction in a single operation using a conditional UPDATE ... WHERE balance_mxn >= amount RETURNING id pattern. If zero rows are returned, the transaction is rejected with INSUFFICIENT_BALANCE before any external API call is made. No partial states, no race conditions."),
      spacer(),
      makeTable(
        ["Transaction Type", "Source", "Badge Color", "Status"],
        [
          ["load_oxxo", "Digital Femsa barcode", "Coral", "pending → completed via webhook"],
          ["load_card", "Conekta tokenized card", "Purple", "completed on charge.paid webhook"],
          ["load_spei", "SPEI inbound transfer", "Blue", "completed on bank webhook"],
          ["bill_pay", "SIPREL / Evoluciona", "Red debit", "atomic with wallet debit"],
          ["SIGNUP_BONUS", "Street team referral", "Green", "credited post OTP verification"],
          ["p2p_send / p2p_receive", "User-to-user transfer", "Orange", "atomic debit + credit"],
        ],
        [22, 28, 16, 34],
      ),
      spacer(),
      heading3("Bill Pay Rail"),
      bullet("Primary: SIPREL — 20+ billers including CFE, Telmex, Telcel, IZZI, Sky, and streaming services"),
      bullet("Fallback: Evoluciona Movil — auto-failover if SIPREL returns an error"),
      bullet("Fee: $25 MXN flat per transaction, deducted atomically from wallet"),
      bullet("Daily AML cap: $50,000 MXN per user per day enforced at the route layer before any provider call"),
      bullet("Loyalty: 1 pt per $10 MXN paid; Bronze/Silver/Gold multipliers; redeemable for wallet credit or fee waiver token"),

      spacer(),
      heading1("4. Street Team Referral & OTP Onboarding"),
      body("Reps recruit users in the field with unique QR codes. The signup flow is fully gated by WhatsApp OTP before any wallet or user record is created."),
      spacer(),
      heading3("Signup Flow (3 screens)"),
      makeTable(
        ["Step", "What Happens", "Fraud Guard"],
        [
          ["Form", "Name, phone (international E.164), CURP, colonia, ref_code captured", "Phone + CURP duplicate check before OTP fires"],
          ["OTP", "6-digit code sent via Twilio WhatsApp, 5-min TTL, 3-attempt limit", "generateOTP resets on resend; max_attempts blocks without expiring session"],
          ["Bonus Credit", "Wallet credited $25-50 MXN via SIGNUP_BONUS transaction", "Idempotency lock on signup_bonus_claimed; rep velocity check (warn @10/hr, block @20/hr)"],
        ],
        [15, 45, 40],
      ),
      spacer(),
      heading3("Rep Dashboard"),
      bullet("Self-serve QR code generation via api.qrserver.com — downloadable, printable"),
      bullet("Shareable signup link with one-tap clipboard copy"),
      bullet("Live recruitment stats: referidos count, bonos acreditados, valor total MXN"),
      bullet("Commission tracker: $5 MXN per confirmed payment, 7-day hold, bulk payout management"),
      bullet("Admin BONOS tab: toggle bonus on/off, set amount ($25/$50), eligible rep codes, velocity thresholds, fraud log"),

      spacer(),
      heading1("5. PagoSeguro — Rent Collection Vertical"),
      body("PagoSeguro (pagoseguromx.com) is a purpose-built vertical on the same infrastructure, serving the landlord-tenant-broker relationship in Mexico. Separate domain for distinct B2B acquisition — same OXXO/SPEI rails, same wallet architecture."),
      spacer(),
      makeTable(
        ["Feature", "Status"],
        [
          ["4 user roles: landlord, tenant, broker, admin", "Live"],
          ["SPEI receipt upload + landlord confirmation workflow", "Live"],
          ["OXXO cash-in integration", "Live"],
          ["Automatic PDF receipt generation", "Live"],
          ["WhatsApp payment notifications", "Live"],
          ["Broker QR codes + printable flyers", "Live"],
          ["Commission tiers: $150 signup / $500 first payment / $300 recurring", "Live"],
          ["8 SEO-optimized landing pages (PV / Jalisco geo-targeted)", "Live"],
          ["Bilingual Spanish + English", "Live"],
          ["Self-serve landlord/tenant demo environment", "Live"],
          ["56 brokers in 28-day HubSpot + Brevo email sequence", "Active"],
          ["Automated recurring charges + late fee logic", "In progress"],
        ],
        [75, 25],
      ),

      spacer(),
      heading1("6. KYC, Security & Compliance"),
      bullet("CURP verification against RENAPO — Nivel 2 unlocks $24,000 MXN/month wallet limit (vs. $6,000 unverified)"),
      bullet("Belvo API integration: aggregation/KYC layer (7 endpoints) + Direct Debit layer (11 endpoints) — UI and backend deployed, awaiting Belvo production credential approval"),
      bullet("JWT authentication + bcrypt password hashing throughout"),
      bullet("Per-landlord CLABE configuration with lease ownership validation (PagoSeguro)"),
      bullet("LFPDPPP-compliant Privacy Notice and Terms of Service live at pagoyamx.com"),
      bullet("HTTP→HTTPS redirect middleware, httpOnly session cookies, secure flag in production"),
      bullet("Immutable audit log via Postgres-level triggers (PagoSeguro payment events)"),
      bullet("UptimeRobot monitoring on both domains"),
      bullet("Rate limiting: payments and transfers capped at 20 requests/15 min per IP; OTP at 5/15 min; wallet loads at 10/15 min — enforced at the Express middleware layer"),
      bullet("AML daily cap: $50,000 MXN per user per day on bill payments, enforced via DB aggregate before any provider call"),
      bullet("Atomic wallet debit: all three debit paths use a single conditional SQL UPDATE with a balance check — eliminates race condition between read and write"),
      bullet("Admin route protection: command center and admin APIs require a secret token (ADMIN_TOKEN env var) passed as X-Admin-Token header or query param"),

      spacer(),
      heading1("7. Test Coverage"),
      makeTable(
        ["Platform", "Test Suite", "Coverage"],
        [
          ["PagoYa", "Bill pay + wallet integration", "75/75 passing (Conekta sandbox)"],
          ["PagoSeguro", "Payment flows + auth", "21/21 passing"],
          ["OTP Service", "generate / verify / clear functions", "Isolated service, manually verified"],
          ["Bonus Service", "Eligibility + velocity + credit", "Isolated service, manually verified"],
        ],
        [25, 45, 30],
      ),

      spacer(),
      heading1("8. Pending Activations (24–48 hrs)"),
      body("Both items below are configuration changes only — all code is complete and tested in sandbox.", { italics: true }),
      spacer(),
      makeTable(
        ["Item", "What Changes", "What It Unlocks"],
        [
          ["SIPREL/Taecel live keys", "Swap env var TAECEL_API_KEY to production", "Real bill payments generating $25 MXN per transaction"],
          ["Conekta live keys", "Swap CONEKTA_API_KEY + register production webhook at pagoyamx.com", "Live card top-ups, saved card support"],
        ],
        [25, 40, 35],
      ),

      spacer(),
      heading1("9. What Is Being Built Next"),
      bullet("Merchant / biller self-service onboarding portal"),
      bullet("Scheduled recurring payments (auto-pay for monthly bills)"),
      bullet("iOS and Android PWA push notifications"),
      bullet("STP / DiMo integration for SPEI outbound and P2P transfers"),
      bullet("Paula for PagoSeguro tenants — ask about rent status, payment history, and upcoming due dates directly in WhatsApp"),
      bullet("PagoSeguro: automated rent collection with late fee logic"),
      bullet("PagoSeguro: WhatsApp payment reminders with embedded payment links"),
      bullet("Multi-property management for institutional landlords (5+ units)"),
      spacer(),
      new Paragraph({
        spacing: { before: 200, after: 0 },
        children: [new TextRun({ text: "All code built by Lloyd Wright (founder) using AI-assisted development via Claude (Anthropic) and Replit. No external development team. Both platforms are live in production with real users in Mexico.", italics: true, color: GRAY, size: 18 })],
      }),
    ],
  }],
});

// ─── HOW FAR ALONG ─────────────────────────────────────────────────────────────

const hfaDoc = new Document({
  styles: {
    default: {
      document: {
        run: { font: "Calibri", color: DARK },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.25),
          right: convertInchesToTwip(1.25),
        },
      },
    },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: "PagoYa — How Far Along Are We?", bold: true, size: 36, color: PURPLE })],
      }),
      body("PagoYa is a live, deployed fintech platform at pagoyamx.com. Mexican consumers use it today to pay utilities, telecom, and streaming bills in under two minutes — without a bank account. But the more complete description is this: PagoYa is a WhatsApp-native financial services platform powered by an agentic AI called Paula. For the 54 million underbanked adults in Mexico, WhatsApp is not a messaging app — it is their operating system. Paula meets them there."),
      spacer(),
      body("PagoYa is the primary product and the website for YC consideration. It encompasses both a core bill payment and wallet platform and a set of purpose-built verticals — including PagoSeguro, our rent collection vertical, which lives at pagoseguromx.com. PagoSeguro is not a separate company — it is PagoYa deployed specifically for landlords, tenants, and property managers, running on the same underlying infrastructure."),

      spacer(),
      heading1("What Is Working and Shipped Today?"),

      heading2("Agentic AI — Paula (the centerpiece of the product)"),
      body("Paula is a Claude-powered AI agent (claude-sonnet-4-5) deployed across two channels simultaneously: WhatsApp (inbound) and an in-app floating chat widget on every page of the product. She is not a FAQ bot. Paula runs a tool-use loop with access to live user data, takes real actions on the user's behalf, and personalizes every conversation using the user's WhatsApp display name — she knows who she is talking to from the first message."),
      spacer(),
      body("Her tools today:"),
      makeTable(
        ["Tool", "What It Does"],
        [
          ["get_wallet_balance", "Tells the user their exact MXN balance in real time"],
          ["get_payment_history", "Retrieves and narrates recent transactions in natural Spanish"],
          ["get_pending_oxxo", "Checks whether a cash deposit is still pending confirmation"],
          ["get_loyalty_points", "Returns the user's current points balance, tier (Bronce/Plata/Oro), and how many points to the next level"],
          ["get_deposit_instructions", "Walks the user through how to add saldo via OXXO, SPEI, or card, step by step, in the same WhatsApp thread"],
          ["prepare_bill_payment", "Validates a payment intent (service, reference, amount), checks wallet balance, stages a payment for 2FA confirmation, returns a fee-inclusive summary for the user to confirm or cancel"],
          ["escalate_to_support", "Hands off to a human agent via WhatsApp with full conversation context"],
        ],
        [30, 70],
      ),
      spacer(),
      body("On WhatsApp, any inbound message routes through the Paula agent loop. Paula greets users by name on first contact, replies in natural Spanish, handles multi-turn conversations, and escalates gracefully when a question is out of scope. In-app, the chat widget persists across every screen with local storage session memory, a typing indicator, and an escalation banner. After every successful payment, the app automatically opens Paula with a contextual celebration message and a prompt for the next payment — turning a transactional receipt moment into a retention touch."),

      spacer(),
      heading2("Paula Payment Initiation from WhatsApp — The Key Differentiator"),
      body("Users initiate and confirm bill payments entirely within WhatsApp — no app download, no browser, no bank account required. Paula handles service lookup, balance validation, fee disclosure, and payment execution in a single conversation thread."),
      spacer(),
      body("MercadoPago, Spin, and Cashi all require an app open for payment confirmation. Paula doesn't. The entire transaction — from intent to folio — happens inside a WhatsApp thread. This is not a UX preference; for the 54 million underbanked Mexicans whose primary device has limited storage and intermittent data, avoiding an app download is the difference between a sale and a lost user."),
      spacer(),
      body("The flow:"),
      bullet("User texts \"paga mi CFE\" (or Telmex, Izzi, Totalplay, any of 20+ billers)"),
      bullet("Paula performs service lookup, validates the reference, and checks wallet balance"),
      bullet("Paula replies: \"💳 CFE · Ref: XXXXXXXXXXXX · $350 MXN + $25 comisión = $375 total. Responde SÍ para confirmar o NO para cancelar.\""),
      bullet("User replies \"sí\" — Paula executes the payment from wallet and returns the folio"),
      bullet("User replies \"no\" — payment cancelled, session cleared"),
      bullet("Pending payments expire automatically after 5 minutes with no response"),
      spacer(),
      body("The 2FA confirmation is handled deterministically at the session layer — not by the language model — so \"sí\" to a pending payment is always a payment execution, regardless of conversation context. Paula cannot be confused or tricked into executing a payment by an ambiguous message. Pending payment state is fully DB-persisted with SQL-enforced expiry — no payment can execute against a stale or in-memory pending state."),

      spacer(),
      heading2("AI Bill Autofill"),
      body("The home screen is a natural-language input. Claude parses \"CFE 350 pesos\" and pre-fills the service, amount, and reference number in one shot. Users who have never used a fintech app understand it immediately — because it works like texting."),

      spacer(),
      heading2("Core Payment Infrastructure"),
      body("Bill payment integrates SIPREL and Evoluciona with automatic failover across 20+ billers. Flat fee of $25 MXN per transaction. Wallet debited atomically per payment. A $50,000 MXN daily per-user cap is enforced at the route layer as an AML control before any provider call is made."),

      spacer(),
      heading2("Digital Wallet — Four Funding Channels"),
      body("PagoYa supports four distinct wallet funding mechanisms — more than any direct competitor at our stage:"),
      bullet("OXXO cash deposits (barcode vouchers generated in-app)"),
      bullet("Card top-ups (Conekta tokenization with saved-card support)"),
      bullet("SPEI inbound bank transfers (webhook-verified)"),
      bullet("Bank direct debit via Belvo Connect — sandbox-verified, production activation pending Belvo approval (single env var swap)"),
      body("All four channels are live or sandbox-complete pending credential activation."),

      spacer(),
      heading2("Loyalty & Rewards"),
      body("Users earn points on every payment (1 pt / $10 MXN, Bronze / Silver / Gold tier multipliers). Points are redeemable for wallet credit or a free-transaction token that waives the $25 MXN fee — enforced atomically inside the payment DB transaction. Paula can check a user's points balance and tier progress in real time from WhatsApp — no app open required."),

      spacer(),
      heading2("Street-Team Referral Network with WhatsApp OTP Onboarding"),
      body("Reps recruit users in the field using unique referral links and QR codes. New users sign up via a three-screen flow: form → WhatsApp OTP verification → bonus wallet credit ($25–$50 MXN incentive). Rep commissions are $5 MXN per confirmed payment with a 7-day hold. The rep earnings dashboard includes a self-serve recruitment section with a shareable signup link, a downloadable QR code, and live recruitment stats pulling from live DB queries. International phone support is built in for migrant communities."),

      spacer(),
      heading2("Security & Fraud Hardening (shipped May 2026)"),
      body("The platform has undergone a full pre-launch security audit with all critical findings resolved:"),
      bullet("Atomic wallet debits — single conditional SQL UPDATE WHERE balance_mxn >= amount RETURNING id across all three debit paths. Zero race-condition window."),
      bullet("Rate limiting — 20 requests/15 min on payments and transfers, 10/15 min on wallet loads, 5/15 min on OTP. Enforced at the Express middleware layer."),
      bullet("AML daily cap — $50,000 MXN per user per day, checked via DB aggregate before any provider call."),
      bullet("Admin route protection — command center and all admin APIs require a cryptographic ADMIN_TOKEN passed as header or query param."),

      spacer(),
      heading2("Conversion Funnel — Engineered for the Underbanked Mobile User"),
      body("Every landing page visitor encounters a structured three-touch acquisition funnel engineered specifically for the devices our users actually carry. A dismissible announcement bar sits immediately below the nav — the second element a visitor reads on any screen size. A hero badge reinforces the offer at the emotional peak of the headline. A bonus strip closes deliberate evaluators. Each touch drives to the same registration CTA. The funnel is not a design choice — it is a conversion architecture built around the viewport reality of a $150 Android phone."),
      spacer(),
      body("SEO landing pages for high-intent bill-pay search queries (/pagar-cfe, /pagar-telmex, /recargas, and geo-targeted variants for Guadalajara and Puerto Vallarta) each include a phone capture form that pre-fills the registration flow — so a visitor who bounces before completing signup has still entered the acquisition funnel."),

      spacer(),
      heading2("Post-OTP Activation Screen (Bienvenida)"),
      body("After completing phone OTP verification, new users land on a dedicated activation screen before reaching the dashboard. Zone 1 confirms the welcome bonus landed — live bonus amount pulled from config, never hardcoded. Zone 2 shows the live wallet balance with a pulsing teal animation that never flashes $0. Zone 3 presents a single primary CTA (\"Paga tu primera cuenta →\"), four biller quick-launch chips (CFE, Telmex, Izzi, Agua), and a WhatsApp shortcut to Paula. The screen is gated — users who have already seen it are redirected to home automatically. This is not onboarding decoration — it is the moment we convert a registered user into a paying one."),

      spacer(),
      heading2("Automated Lifecycle Nudges — Two-Touch Post-Registration Sequence"),
      bullet("T+10 minutes — Activation nudge: Every new user who completes registration receives a personalized WhatsApp message from Paula exactly 10 minutes after sign-up, skipped only if they have already transacted. It references their first name, confirms the bonus amount, and includes a direct deep-link back into the payment flow."),
      bullet("T+48 hours — Retention nudge: Users who register but do not transact within 48 hours receive a second WhatsApp message reminding them of their available balance and surfacing Paula as an immediate payment assistant. The nudge fires within a 48–72 hour window via an hourly cron, respects a deduplication guard, and skips users who have already made a real payment."),
      spacer(),
      body("Both nudges are DB-backed with timestamp tracking and full admin visibility — a fully automated two-touch lifecycle sequence that runs without any manual outreach."),

      spacer(),
      heading2("Admin Command Center and Analytics Infrastructure"),
      body("Live at pagoyamx.com/command-center.html (token-protected). Real-time operations dashboard with five stat tiles: Total usuarios, Nudge enviado (T+10 activation reach), Bono acreditado (funded wallet rate), Pantalla vista (activation screen reach), and Retención (T+48h nudge reach). Every registered user is visible with nudge status, bonus status, welcome screen status, signup source, and rep attribution. Auto-refreshes every 60 seconds. PostHog integrated for funnel analytics. signup_source on every registration enables clean channel-level attribution from day one."),

      spacer(),
      heading2("PWA — Native App Experience, Zero App Store Friction"),
      body("PagoYa is a fully installable Progressive Web App on iOS and Android. Service worker, Web App Manifest, VAPID push, and a push_subscriptions table in PostgreSQL are all live. Every successful bill payment triggers a push notification to the user's device even when the browser is closed. For a user with 2GB of storage and a prepaid data plan, this is not a convenience — it is the only viable distribution model."),

      spacer(),
      heading2("PagoSeguro — Rent Collection Vertical"),
      body("Four user roles, all functional: landlords manage properties and review payments; tenants pay via SPEI or OXXO and upload receipts; brokers and sales reps get QR codes, flyers, and automated commission tracking; admins see global platform stats. SPEI receipt upload with landlord confirmation workflow, OXXO cash-in, automatic PDF receipt generation, and WhatsApp payment notifications via Twilio are all live. 8 SEO-optimized landing pages targeting Puerto Vallarta and Jalisco. Bilingual. PagoSeguro is currently being used to collect rent for properties in Puerto Vallarta and Riviera Nayarit."),

      spacer(),
      heading1("What Is In Progress?"),
      bullet("Bank direct debit production activation — Belvo Connect widget and topup API are sandbox-complete; awaiting Belvo production credential approval. One environment variable swap (BELVO_ENV=production) activates the live rail."),
      bullet("Conekta live API key swap — card top-up is sandbox-complete, pending live credential activation."),
      bullet("Merchant / biller onboarding portal for self-service biller registration."),
      bullet("Scheduled recurring payments — auto-pay for monthly bills."),
      bullet("Paula for PagoSeguro tenants — ask about rent status, payment history, and upcoming due dates directly in WhatsApp."),
      bullet("PagoSeguro: automated rent collection with recurring charges and late fee logic; WhatsApp payment reminders with embedded payment links; multi-property management for institutional landlords."),
      bullet("DiMo-based P2P transfers (Phase 2) — Venmo, Zelle, and CashApp have no Mexico presence; PagoYa is positioned to own peer-to-peer transfers for the underbanked segment the moment DiMo rails are live."),

      spacer(),
      heading1("Traction and Team"),
      body("The entire platform — PagoYa and PagoSeguro — has been built and iterated by a founding team without an external development team. We have live users in Mexico, a functional rep referral network actively seeding Jalisco, and a structured go-to-market into underbanked communities in Puerto Vallarta and Guadalajara underway. pagoyamx.com is live with custom domain TLS and works on any mobile browser — no app store download required. PagoSeguro is live and collecting rent for properties in Puerto Vallarta and Riviera Nayarit today."),
      spacer(),
      body("The velocity matters: the infrastructure described in this document — four funding channels, agentic AI across two deployment surfaces, a seven-tool agent loop, a two-touch lifecycle nudge sequence, PWA push, DB-persisted payment state, AML controls, rate limiting, and a full admin analytics layer — was built and shipped without outside engineering resources. We are not describing a roadmap. We are describing what is running in production."),

      spacer(),
      heading1("Why This Is Different From Other LATAM Fintech"),
      body("MercadoPago, Spin, and Cashi are app-first products. Every payment confirmation requires an app open. For the underbanked user with a $150 Android phone and 2GB of storage, that is a real barrier. Paula eliminates it entirely. A user with zero apps installed, zero bank account, and zero fintech experience can pay their electricity bill, check their loyalty points, and load saldo — in four WhatsApp messages."),
      spacer(),
      body("Most fintech in Mexico is still trying to convince underbanked users to adopt a new interface. We deployed AI into the interface they already use twelve hours a day. Paula on WhatsApp means a user can check their balance, ask why a payment failed, get their receipt narrated back to them, find out how many points they need to reach Gold tier, or pay their CFE bill — without opening anything, without a login screen, in the same thread they use to talk to their family."),
      spacer(),
      body("PagoSeguro applies the same logic to housing: landlords in Mexico still collect rent via cash or informal bank transfers with no paper trail. PagoSeguro gives them digital collection, automatic receipts, and WhatsApp confirmation — without asking them to change how they think about rent."),
      spacer(),
      new Paragraph({
        spacing: { before: 120, after: 0 },
        children: [new TextRun({ text: "The product is not the app. The product is Paula. The app, PagoSeguro, and every channel we deploy her through are Paula's backend. The moat is not the wallet infrastructure — competitors can replicate rails. The moat is an AI agent that already speaks the language, lives in the right channel, gets smarter with every conversation, and knows your name before you finish saying hello. That is not a feature. That is the company.", bold: true, color: PURPLE, size: 22 })],
      }),
    ],
  }],
});

const techBuffer = await Packer.toBuffer(techDoc);
const hfaBuffer = await Packer.toBuffer(hfaDoc);

writeFileSync("docs/yc/PagoYa-Technical-Summary-YC.docx", techBuffer);
writeFileSync("docs/yc/PagoYa-How-Far-Along-YC.docx", hfaBuffer);

console.log("Done: both .docx files written to docs/yc/");
