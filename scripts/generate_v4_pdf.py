#!/usr/bin/env python3
"""Generate PagoYa Street Team Onboarding Guide v4 PDF using ReportLab."""

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.lib.colors import HexColor

# ── Palette ───────────────────────────────────────────────────────────────────
NAVY       = HexColor("#0A2540")
TEAL       = HexColor("#00C88E")
TEAL_LIGHT = HexColor("#E8F9F5")
AMBER_BG   = HexColor("#FFF3CD")
AMBER      = HexColor("#856404")
RED_BG     = HexColor("#F8D7DA")
RED_TEXT   = HexColor("#721C24")
WHITE      = colors.white
GREY_ROW   = HexColor("#F4F6F8")
GREY_LINE  = HexColor("#DEE2E6")
BODY_TEXT  = HexColor("#1A1A2E")
MID_GREY   = HexColor("#6C757D")

FOOTER_STR = "PagoYa Technologies SA de CV  |  pagoyamx.com  |  soporte@pagoyamx.com  |  August 2026"

# ── Page setup ────────────────────────────────────────────────────────────────
PAGE_W, PAGE_H = letter
L_MARGIN = R_MARGIN = 0.75 * inch
T_MARGIN = B_MARGIN = 0.75 * inch
BODY_W = PAGE_W - L_MARGIN - R_MARGIN

# ── Styles ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

STY_H1 = S("H1", fontSize=13, fontName="Helvetica-Bold", textColor=NAVY,
           spaceBefore=12, spaceAfter=4, leading=16)
STY_H2 = S("H2", fontSize=10.5, fontName="Helvetica-Bold", textColor=NAVY,
           spaceBefore=8, spaceAfter=3, leading=13)
STY_BODY = S("Body", fontSize=9.5, fontName="Helvetica", textColor=BODY_TEXT,
             spaceBefore=2, spaceAfter=3, leading=13)
STY_BOLD = S("Bold", fontSize=9.5, fontName="Helvetica-Bold", textColor=BODY_TEXT,
             spaceBefore=2, spaceAfter=3, leading=13)
STY_BULLET = S("Bullet", fontSize=9.5, fontName="Helvetica", textColor=BODY_TEXT,
               spaceBefore=1, spaceAfter=1, leading=13,
               leftIndent=14, firstLineIndent=-10)
STY_NOTE = S("Note", fontSize=9, fontName="Helvetica-Oblique", textColor=BODY_TEXT,
             spaceBefore=2, spaceAfter=2, leading=12, leftIndent=8, rightIndent=8)
STY_WARN = S("Warn", fontSize=9, fontName="Helvetica-Bold", textColor=HexColor("#7B3A00"),
             spaceBefore=2, spaceAfter=2, leading=12, leftIndent=8, rightIndent=8)
STY_TBL_HDR = S("TblHdr", fontSize=8.5, fontName="Helvetica-Bold",
                textColor=WHITE, leading=11)
STY_TBL_BODY = S("TblBody", fontSize=8.5, fontName="Helvetica",
                 textColor=BODY_TEXT, leading=11)
STY_TBL_BOLD = S("TblBold", fontSize=8.5, fontName="Helvetica-Bold",
                 textColor=BODY_TEXT, leading=11)
STY_SMALL = S("Small", fontSize=8, fontName="Helvetica", textColor=MID_GREY,
              leading=10)
STY_COVER_TITLE = S("CoverTitle", fontSize=26, fontName="Helvetica-Bold",
                    textColor=WHITE, leading=32, spaceAfter=4)
STY_COVER_SUB = S("CoverSub", fontSize=12, fontName="Helvetica-Bold",
                  textColor=TEAL, leading=16)
STY_COVER_META = S("CoverMeta", fontSize=9, fontName="Helvetica",
                   textColor=HexColor("#555555"), leading=12)
STY_FOOTER = S("Footer", fontSize=7.5, fontName="Helvetica", textColor=MID_GREY,
               alignment=TA_CENTER)
STY_STEP_TITLE = S("StepTitle", fontSize=9.5, fontName="Helvetica-Bold",
                   textColor=NAVY, spaceBefore=5, spaceAfter=1, leading=12)
STY_STEP_BODY = S("StepBody", fontSize=9.5, fontName="Helvetica", textColor=BODY_TEXT,
                  spaceBefore=0, spaceAfter=4, leading=13, leftIndent=10)

# ── Helpers ───────────────────────────────────────────────────────────────────

def p(text, style=STY_BODY):
    return Paragraph(text, style)

def sp(h=6):
    return Spacer(1, h)

def hr():
    return HRFlowable(width="100%", thickness=0.5, color=GREY_LINE,
                      spaceAfter=4, spaceBefore=4)

def bullet(text, bold_prefix=None):
    if bold_prefix:
        return Paragraph(f"<b>{bold_prefix}</b> {text}", STY_BULLET)
    return Paragraph(f"\u2022\u2002{text}", STY_BULLET)

def note_box(text, bg=TEAL_LIGHT, icon="\u2714", text_style=None):
    sty = text_style or STY_NOTE
    inner = Table(
        [[Paragraph(f"<b>{icon}</b>\u2002{text}", sty)]],
        colWidths=[BODY_W - 0.2*inch],
    )
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
        ("ROUNDEDCORNERS", [4]),
    ]))
    return [inner, sp(5)]

def warn_box(text):
    return note_box(text, bg=AMBER_BG, icon="\u26a0\ufe0f", text_style=STY_WARN)

def tbl(headers, rows, col_widths, alt=True):
    """Build a styled table. Each cell can be str or Paragraph."""
    def cell(v):
        if isinstance(v, str):
            return Paragraph(v, STY_TBL_BODY)
        return v
    def hdr(v):
        return Paragraph(v, STY_TBL_HDR)

    data = [[hdr(h) for h in headers]] + [[cell(c) for c in row] for row in rows]
    t = Table(data, colWidths=[w * inch for w in col_widths], repeatRows=1)

    style_cmds = [
        ("BACKGROUND",    (0,0), (-1,0), NAVY),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING",   (0,0), (-1,-1), 5),
        ("RIGHTPADDING",  (0,0), (-1,-1), 5),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("GRID",          (0,0), (-1,-1), 0.4, GREY_LINE),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
    ]
    if alt:
        for i in range(1, len(rows)+1):
            bg = GREY_ROW if i % 2 == 1 else WHITE
            style_cmds.append(("BACKGROUND", (0,i), (-1,i), bg))
    t.setStyle(TableStyle(style_cmds))
    return [t, sp(6)]

# ── Footer / header on every page ─────────────────────────────────────────────

def on_page(canvas, doc):
    canvas.saveState()
    # Footer line
    canvas.setStrokeColor(GREY_LINE)
    canvas.setLineWidth(0.4)
    canvas.line(L_MARGIN, B_MARGIN - 2, PAGE_W - R_MARGIN, B_MARGIN - 2)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MID_GREY)
    canvas.drawCentredString(PAGE_W / 2, B_MARGIN - 12, FOOTER_STR)
    # Page number
    canvas.drawRightString(PAGE_W - R_MARGIN, B_MARGIN - 12, f"Page {doc.page}")
    # Top right version tag (not on cover)
    if doc.page > 1:
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(PAGE_W - R_MARGIN, PAGE_H - 0.45*inch,
                               "v4.0 — August 2026 — INTERNAL")
    canvas.restoreState()

def on_first_page(canvas, doc):
    on_page(canvas, doc)

# ── Cover page ────────────────────────────────────────────────────────────────

def cover_page():
    elements = []

    # Dark navy banner
    banner = Table(
        [[Paragraph("PagoYa", STY_COVER_TITLE)],
         [Paragraph("Street Team Sales Rep — Onboarding Guide", STY_COVER_SUB)]],
        colWidths=[BODY_W],
    )
    banner.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), NAVY),
        ("TOPPADDING",    (0,0), (-1,-1), 20),
        ("BOTTOMPADDING", (0,0), (-1,-1), 20),
        ("LEFTPADDING",   (0,0), (-1,-1), 16),
        ("RIGHTPADDING",  (0,0), (-1,-1), 16),
    ]))
    elements.append(banner)
    elements.append(sp(10))

    # Meta block
    meta = Table([
        [Paragraph("Puerto Vallarta &amp; Riviera Nayarit Field Team", STY_COVER_SUB)],
        [Paragraph("Version 4.0  |  August 2026  |  INTERNAL — Do not distribute to customers", STY_COVER_META)],
        [Paragraph("PagoYa Technologies SA de CV  |  pagoyamx.com", STY_COVER_META)],
    ], colWidths=[BODY_W])
    meta.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), TEAL_LIGHT),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ("RIGHTPADDING",  (0,0), (-1,-1), 12),
    ]))
    elements.append(meta)
    elements.append(sp(14))

    # What's new box
    changes = [
        "\u2022 Fee corrected: <b>$25 MXN</b> per transaction (was incorrectly listed as $15 MXN in v3)",
        "\u2022 <b>$150 MXN signup bonus</b> added — your most powerful sales pitch",
        "\u2022 <b>Paula AI assistant</b> section added (every user gets her free via WhatsApp)",
        "\u2022 Territory expanded: <b>Nayarit municipalities</b> now open for registration",
        "\u2022 \u26a0\ufe0f Water bill limitation for Nayarit reps documented",
        "\u2022 <b>Pay structure section</b> added (was missing from v3)",
        "\u2022 <b>Regional Lead / Field Director</b> role defined",
        "\u2022 Company name corrected: <b>PagoYa Technologies SA de CV</b>",
        "\u2022 Service catalog updated: <b>50+ services</b> (was listed as 26+)",
    ]
    change_sty = ParagraphStyle("ChangeSty", fontSize=9, fontName="Helvetica",
                                 textColor=BODY_TEXT, leading=13, spaceBefore=1, spaceAfter=1)
    inner_data = [[Paragraph("\u26a1\u2002What's New in v4 (August 2026)",
                             ParagraphStyle("NewHdr", fontSize=10.5, fontName="Helvetica-Bold",
                                            textColor=NAVY, leading=14, spaceAfter=5))]]
    for c in changes:
        inner_data.append([Paragraph(c, change_sty)])

    new_box = Table(inner_data, colWidths=[BODY_W - 0.4*inch])
    new_box.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), AMBER_BG),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ("RIGHTPADDING",  (0,0), (-1,-1), 12),
        ("TOPPADDING",    (0,0), (0,0), 10),
        ("BOTTOMPADDING", (0,-1), (0,-1), 10),
    ]))
    elements.append(new_box)
    elements.append(PageBreak())
    return elements

# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT BODY
# ─────────────────────────────────────────────────────────────────────────────

story = cover_page()

# ── 1. WELCOME ────────────────────────────────────────────────────────────────
story += [p("1. Welcome to Team PagoYa", STY_H1)]
story += [p("Congratulations on joining the PagoYa field team. You are the face of the company in your community.")]
story += [p("Your mission: talk to people who pay utility bills in cash or online — electricity, water, phone — and show them there is an easier, faster way with no waiting in line.")]
story += [sp(4), p("Three things to know before your first day in the field:", STY_BOLD)]
story += [bullet("The platform fee is <b>$25 MXN per transaction</b> — flat, no hidden charges, shown before the user confirms.")]
story += [bullet("Every new user receives a <b>$150 MXN signup bonus</b> credited to their wallet — this is your most powerful opening pitch.")]
story += [bullet("Every user also gets <b>Paula</b>, PagoYa's AI payment assistant on WhatsApp, free. She sends reminders, helps with payments, and answers questions automatically.")]
story += note_box("This guide gives you everything you need to make your first sale on day one. Read it, practise the demo script, and know your territory zone.")
story += [hr()]

# ── 2. WHAT IS PAGOYA ─────────────────────────────────────────────────────────
story += [p("2. What is PagoYa?", STY_H1)]
story += [p("PagoYa is a mobile payment platform that lets users pay household bills (CFE, water, Telmex, Izzi, etc.) and top up mobile credit — all from their phone. Works with or without a bank account.")]
story += [sp(4), p("How it works:", STY_BOLD)]
story += tbl(
    headers=["Step", "Option A — Has bank account / card", "Option B — Cash / no bank account"],
    rows=[
        ("1. Register",
         "Open pagoyamx.com/register. Enter name, phone number, city, and colonia. Confirm via WhatsApp verification code. Done in 2 minutes.",
         "Same — open pagoyamx.com/register. Enter name, phone, city, colonia. Confirm via WhatsApp code."),
        ("2. Load balance",
         "Pay directly with debit or credit card in the app — no OXXO trip needed.",
         "Go to any OXXO store. Show the barcode generated in the app. Pay cash. Min $50 MXN."),
        ("3. Pay the bill",
         "Select the service, enter account number, confirm. Payment processes in seconds.",
         "Same — select service, enter account number, confirm. Payment processes in seconds."),
        ("4. Receipt + Bonus",
         "Confirmation + receipt sent via WhatsApp. $150 MXN bonus credited on first payment.",
         "Same — confirmation + receipt via WhatsApp. $150 MXN bonus credited on first payment."),
    ],
    col_widths=[0.9, 2.9, 2.9],
)
story += note_box("Key facts: Flat <b>$25 MXN fee</b> per transaction. No monthly fee. No subscription. No surprises. <b>$150 MXN signup bonus</b> credited to wallet on first payment.")
story += [hr()]

# ── 3. SERVICES ───────────────────────────────────────────────────────────────
story += [p("3. Services PagoYa Can Pay", STY_H1)]
story += tbl(
    headers=["Category", "Examples"],
    rows=[
        ("Electricity", "CFE (all of Mexico)"),
        ("Landline / Internet", "Telmex, Izzi, Totalplay, Megacable, Sky, Dish, Maxcom, Starlink"),
        ("Mobile top-ups", "Telcel, AT&T, Movistar — multiple denominations ($10–$200)"),
        ("Water", "SIAPA Jalisco (Guadalajara area), SEAPAL Vallarta (Puerto Vallarta)\n\u26a0\ufe0f Nayarit water (CAPA) NOT available — see note below"),
        ("Gift cards", "Netflix, Spotify, Google Play, Xbox, Amazon — fixed denominations"),
        ("50+ services total", "Gas, streaming, pay-TV, and more in the full catalog"),
    ],
    col_widths=[1.9, 4.8],
)
story += warn_box(
    "NAYARIT WATER BILLS — IMPORTANT FOR RIVIERA NAYARIT REPS: The Nayarit municipal water utility "
    "(CAPA) is NOT currently available in the PagoYa catalog. Do NOT promise Nayarit water bill payments. "
    "CFE, Telmex, mobile top-ups, and all national services work normally in Nayarit. Water coverage is on the roadmap."
)
story += [hr()]

# ── 4. YOUR ROLE ──────────────────────────────────────────────────────────────
story += [p("4. Your Role as a Field Rep", STY_H1)]
story += [p("Your job is to identify prospects and guide them through registration. You are an advisor helping people save time and avoid lines — not a collector or technician.")]
story += [sp(3), p("Who to talk to:", STY_BOLD)]
story += [bullet("People heading to OXXO or convenience stores to pay bills in cash")]
story += [bullet("People who pay bills online but find it frustrating or slow")]
story += [bullet("Small business owners who pay business utility bills")]
story += [bullet("Older adults who have a phone but are not comfortable with banking apps")]
story += [bullet("Workers in markets, restaurants, and service industry who need quick mobile top-ups")]
story += [sp(3), p("What you do NOT do:", STY_BOLD)]
story += [bullet("You do not handle customer money — PagoYa never gives you cash or asks you to collect it")]
story += [bullet("You are not responsible for processing payments — the app does everything")]
story += [bullet("You do not make promises about features not in the app or timelines you cannot guarantee")]
story += [hr()]

# ── 5. TERRITORY ──────────────────────────────────────────────────────────────
story += [p("5. Territory Coverage", STY_H1)]
story += [p("PagoYa is now open for registration across Puerto Vallarta (Jalisco) and Riviera Nayarit. Both regions are active. Operate in your assigned zone only and coordinate with your Regional Lead before entering a new area.")]

story += [sp(4), p("Puerto Vallarta Zones", STY_H2)]
story += tbl(
    headers=["Zone / Neighborhood", "Why It Works", "Best Time"],
    rows=[
        ("Zona Romántica / Col. E. Zapata",
         "Highest density of workers, renters, small business owners. Many pay CFE and Telmex monthly. High foot traffic on Basilio Badillo and Insurgentes.",
         "10am – 2pm"),
        ("5 de Diciembre",
         "Mix of local families and digital nomads. Many unbanked and semi-banked residents. Close to market areas with high cash usage.",
         "9am – 1pm"),
        ("Versalles",
         "Business district. Workers paying utilities at lunch. Service industry employees. Taquería and abarrote strip has high dwell time.",
         "12pm – 3pm"),
        ("Pitillal",
         "Densely populated local neighborhood. Very low banking penetration. High cash economy. Strongest underbanked use case in PV.",
         "9am – 12pm"),
        ("Fluvial Vallarta",
         "Large residential colonia, many families. Mix of banked and unbanked. Multiple OXXO locations nearby — easy to show the deposit flow.",
         "4pm – 7pm"),
        ("Col. Lázaro Cárdenas",
         "Working-class residential. High proportion of CFE, Telmex, and water bill payers. Low app literacy — go slowly, demo patiently.",
         "Morning"),
        ("Marina Vallarta (workers)",
         "Hotel and marina employees. Banked users who find bill pay friction frustrating. Card payment pitch works best here.",
         "Early morning / after shift"),
        ("Mercado Río Cuale",
         "Vendors, stall owners, market workers. Cash-first economy. Strong OXXO top-up use case. Many pay Telcel recargas weekly.",
         "8am – 11am"),
    ],
    col_widths=[1.8, 3.7, 1.2],
)
story += note_box("Pitillal and Zona Romántica are your highest-priority PV zones. Start there in your first week.")

story += [sp(4), p("Riviera Nayarit Zones — Open August 2026", STY_H2)]
story += tbl(
    headers=["Zone / Municipality", "Why It Works", "Best Time", "Water Bills?"],
    rows=[
        ("Bahía de Banderas\n(Mezcales, Valle de Banderas)",
         "Large residential municipality. Mix of local workers and new residents. Strong CFE, Telmex, and mobile top-up use case.",
         "9am – 1pm",
         Paragraph("\u26a0\ufe0f NO\nCAPA not available", STY_TBL_BODY)),
        ("Bucerías",
         "High-traffic town centre. Mix of expats and local workers. Many pay CFE and internet bills. OXXO nearby for cash loading.",
         "9am – 12pm",
         Paragraph("\u26a0\ufe0f NO\nCAPA not available", STY_TBL_BODY)),
        ("La Cruz de Huanacaxtle",
         "Marina workers, local fishing community. Growing expat population. Strong card-payment pitch for banked marina employees.",
         "Morning /\nearly afternoon",
         Paragraph("\u26a0\ufe0f NO\nCAPA not available", STY_TBL_BODY)),
        ("Sayulita",
         "Tourist-heavy town. Mix of seasonal workers and local residents. Mobile top-ups and Telcel recargas are strong here.",
         "10am – 2pm",
         Paragraph("\u26a0\ufe0f NO\nCAPA not available", STY_TBL_BODY)),
        ("Nuevo Vallarta / Flamingos",
         "Resort corridor workers. Hotel and hospitality employees. Banked users — lead with card payment convenience pitch.",
         "Early morning / after shift",
         Paragraph("\u26a0\ufe0f NO\nCAPA not available", STY_TBL_BODY)),
        ("Tepic (city centre)",
         "State capital. Larger population, higher density. CFE, Telmex, mobile top-ups all strong. Less competitive market than PV.",
         "9am – 1pm",
         Paragraph("\u26a0\ufe0f NO\nCAPA not available", STY_TBL_BODY)),
    ],
    col_widths=[1.65, 2.85, 1.15, 1.05],
)
story += warn_box(
    "WATER BILLS IN NAYARIT: Do NOT pitch water bill payment to Nayarit residents. CAPA (the Nayarit "
    "water authority) is not in the catalog. Lead with CFE, Telmex, and mobile top-ups — all work "
    "normally. Your coordinator will notify you when Nayarit water coverage goes live."
)
story += [hr()]

# ── 6. OUTREACH ───────────────────────────────────────────────────────────────
story += [p("6. Outreach Methods", STY_H1)]
story += tbl(
    headers=["Method", "How to Use It", "Best For"],
    rows=[
        ("Street walk — SE RENTA zones",
         "Walk streets with high 'Se Renta' signage. Talk to anyone entering/exiting tiendas, waiting at bus stops, or paying at OXXO.",
         "Unbanked + semi-banked users"),
        ("OXXO entrance / exit",
         "Position near the door during morning bill-pay rush (9–11am). Show users there is a faster way that also gives them $150 pesos.",
         "Cash users already in the habit"),
        ("Mercados and tianguis",
         "Approach vendors and shoppers. Demo on your phone. Leave flyers with QR. Lunch hour best.",
         "Informal economy workers"),
        ("Taquería / abarrote strip",
         "Workers on break. Short attention — lead with: '$25 pesos, sin filas, desde tu celular. Y te damos $150 de bono al registrarte.'",
         "Service industry employees"),
        ("WhatsApp follow-up",
         "If they don't register on the spot: 'Aquí el link: pagoyamx.com — sin descargar nada. Recibes $150 MXN de bono.'",
         "Warm leads who showed interest"),
        ("QR flyer drop",
         "Leave printed flyers at abarrotes, papelerías, lavandería waiting areas, and doctor offices.",
         "Passive awareness in target zones"),
        ("Referral ask",
         "After every registration: '¿Conoces a alguien más que pague luz o Telmex en efectivo?' One referral per user averages 40% conversion.",
         "Expanding warm network"),
    ],
    col_widths=[1.6, 3.5, 1.6],
)
story += [hr()]

# ── 7. DEMO ───────────────────────────────────────────────────────────────────
story += [p("7. How to Do a 5-Minute Demo", STY_H1)]
story += [p("Practise this flow until you can do it from memory before going into the field."), sp(4)]

demo_steps = [
    ("Step 1 — Quick greeting (30 sec)",
     '"Hi, let me introduce you to PagoYa — pay your electricity bill or top up your phone without waiting in line. '
     'You get $150 pesos just for signing up. Takes 2 minutes. Can I show you?"'),
    ("Step 2 — Ask one qualifying question (15 sec)",
     '"Do you have a bank account or debit card, or do you prefer to pay in cash?" '
     'This tells you which path to show. Both paths register the same way.'),
    ("Step 3 — Show the app (60 sec)",
     "Open pagoyamx.com on your phone. Walk through the registration screen. Show the card payment flow for banked users, or the OXXO barcode flow for cash users."),
    ("Step 4 — The cost and the bonus (30 sec)",
     '"The fee is a flat $25 pesos per payment — no monthly charge. And the $150 peso bonus you got for signing up covers it six times over on your first payments."'),
    ("Step 5 — Paula (20 sec)",
     '"You also get Paula — a personal assistant on WhatsApp. She reminds you when bills are due, helps you pay them, '
     'and answers your questions. It\'s included, completely free."'),
    ("Step 6 — Close (60 sec)",
     '"Can I register you now, or would you prefer I send you the link? Registration takes 2 minutes and the $150 pesos goes straight to your account."'),
    ("Step 7 — Follow-up",
     "If they don't register on the spot, get their number and send the link with a reminder about the $150 MXN bonus."),
]
for title, body in demo_steps:
    story += [p(title, STY_STEP_TITLE), p(body, STY_STEP_BODY)]

story += note_box("Your main tool: <b>pagoyamx.com</b> — works on any phone with internet. Nothing to download.")
story += [hr()]

# ── 8. REGISTRATION ───────────────────────────────────────────────────────────
story += [p("8. How to Register a User", STY_H1)]
story += [p("Registration is 100% free and the same for banked and unbanked users. Follow these steps:")]
for i, s in enumerate([
    "Open pagoyamx.com/register on the customer's phone (or yours to demonstrate).",
    "The customer enters their name, mobile number, city, and colonia.",
    "They confirm with a verification code sent via WhatsApp.",
    "They tick the <b>WhatsApp opt-in checkbox</b> to receive confirmations and reminders from Paula.",
    "Done — they now have a PagoYa wallet with <b>$150 MXN bonus</b> ready for their first payment.",
], 1):
    story += [Paragraph(f"<b>{i}.</b> {s}", STY_BULLET)]

story += [sp(4)]
story += tbl(
    headers=["Has debit / credit card", "Has cash only"],
    rows=[("They can add their card in the app and pay bills immediately — no OXXO trip needed.",
           "Direct them to any OXXO. Show the 'Deposit at OXXO' button. Minimum $50 MXN to start.")],
    col_widths=[3.35, 3.35],
)
story += note_box("Tip: If they can't register right now, share the link via WhatsApp and mention the $150 MXN bonus — it creates urgency.")
story += [hr()]

# ── 9. OBJECTIONS ─────────────────────────────────────────────────────────────
story += [p("9. Handling Common Objections", STY_H1)]
story += tbl(
    headers=["Customer says...", "You say..."],
    rows=[
        ('"I already have a bank account"',
         '"Even better — you can pay directly with your card in the app. No OXXO trip. And you still get the $150 pesos just for signing up."'),
        ('"I don\'t have a bank account or card"',
         '"No problem — PagoYa works without one. Just go to any OXXO with cash, get a barcode from the app, and deposit. Done."'),
        ('"What if I get overcharged?"',
         '"The fee is always a flat $25 MXN and it\'s shown before you confirm. No surprises, ever."'),
        ('"I don\'t trust giving out my info"',
         '"We only ask for your name, phone number, city, and colonia to sign up. No bank details required."'),
        ('"What if my payment goes wrong?"',
         '"Every payment gets a confirmation folio. Support is at soporte@pagoyamx.com and Paula on WhatsApp helps immediately."'),
        ('"I already pay at OXXO directly"',
         '"With PagoYa you do it from your phone — no line at the register. Load once, pay anytime. Plus $150 pesos free."'),
        ('"I don\'t know how to use apps"',
         '"It\'s a website, not an app — nothing to download. If you can send a WhatsApp, you can use PagoYa."'),
        ('"Can I pay my water bill in Nayarit?"',
         '"CFE, Telmex, and mobile top-ups all work in Nayarit. Water utilities in Nayarit are being added — I\'ll let you know when it\'s live."'),
        ('"Can I pay my rent with this?"',
         '"Yes — there\'s a separate platform for rent called PagoSeguro at pagoseguromx.com, linked from pagoyamx.com. Same idea, built for landlords and tenants."'),
    ],
    col_widths=[2.3, 4.4],
)
story += [hr()]

# ── 10. PAY STRUCTURE ─────────────────────────────────────────────────────────
story += [p("10. Pay Structure", STY_H1)]
story += [p("PagoYa pays commissions based on the activity your registered users generate — not on registrations alone. This aligns your incentive with genuine customer activation.")]

story += [sp(4), p("Field Rep", STY_H2)]
story += tbl(
    headers=["Event", "Your Earnings", "Hold Period", "Notes"],
    rows=[
        ("User completes registration", "$0", "—",
         "Registration is free for users; no per-signup rep commission."),
        ("User makes a confirmed bill payment", Paragraph("<b>$5 MXN</b>", STY_TBL_BOLD),
         "7 days", "Per payment. Tracks automatically to your rep code."),
        ("Monthly performance bonus", "TBD", "—",
         "Bonus tier for high-performing reps — confirm amount with your coordinator."),
    ],
    col_widths=[2.3, 1.0, 0.9, 2.5],
)
story += [p("How commissions are tracked:", STY_BOLD)]
story += [bullet("Every user you register is linked to your unique rep code (e.g. ENG-01).")]
story += [bullet("When any user you recruited makes a bill payment, $5 MXN is logged automatically against your code.")]
story += [bullet("Commissions are held 7 days (payment reversal window), then marked payable.")]
story += [bullet("Your coordinator reviews totals weekly. Payout method — confirm with your coordinator.")]
story += note_box(
    "Example: You recruit 20 users in a month. 10 of them each make 4 payments = 40 payments × $5 = "
    "<b>$200 MXN commission</b> that month. Active users who pay regularly compound your earnings over time."
)

story += [sp(4), p("Regional Lead / Field Director", STY_H2)]
story += tbl(
    headers=["Role", "Base Commission", "Team Override", "Responsibilities"],
    rows=[(
        Paragraph("<b>Regional Lead /\nField Director</b>", STY_TBL_BOLD),
        "$5 MXN per payment from own recruits\n(same as field rep)",
        Paragraph("<b>$2 MXN</b> per confirmed payment from each rep on your team\n(proposed — pending final confirmation)", STY_TBL_BODY),
        "Zone coordination, daily rep reporting, quality control, escalation point for field issues",
    )],
    col_widths=[1.35, 1.6, 2.05, 1.7],
)
story += warn_box(
    "REGIONAL LEAD STRUCTURE — PENDING CONFIRMATION: The $2 MXN team override above is a proposed "
    "starting rate and has not been formally approved. Your coordinator will confirm the final override "
    "rate, team size, and reporting cadence before your first week. The base $5 MXN/payment commission "
    "is active and confirmed in the system."
)
story += [p("Regional Lead additional responsibilities:", STY_BOLD)]
story += [bullet("Daily check-ins with each rep in your zone (WhatsApp group or in-person)")]
story += [bullet("Reviewing registration quality — flag duplicate or suspicious accounts immediately")]
story += [bullet("Reporting aggregate zone metrics to HQ weekly: registrations, payments, issues")]
story += [bullet("First escalation point for customer complaints — reps must not handle complaints directly")]
story += [bullet("Onboarding new reps added to the region and ensuring they have materials")]
story += [hr()]

# ── 11. PAULA ─────────────────────────────────────────────────────────────────
story += [p("11. Paula — Your User's AI Assistant", STY_H1)]
story += [p("Paula is PagoYa's AI-powered payment assistant available to every user free via WhatsApp. She proactively reaches out, reminds users when bills may be due, and helps them complete payments.")]
story += [sp(3), p("What Paula does for your users:", STY_BOLD)]
story += [bullet("Sends a personal welcome message after registration")]
story += [bullet("Guides new users through their first payment step by step")]
story += [bullet("Reminds users when bills are likely due based on their payment history")]
story += [bullet("Answers questions about balance, payments, and services via WhatsApp")]
story += [bullet("Escalates urgent issues to the support team automatically")]
story += [sp(3), p("Why this matters for your pitch:", STY_BOLD)]
story += [bullet("Paula makes PagoYa stickier than a normal payment app — users who interact with her stay active longer")]
story += [bullet("Use it in your close: 'You'll get a personal assistant on WhatsApp who reminds you when your CFE bill is coming up — completely free'")]
story += [bullet("Users must opt in to WhatsApp messages during registration — make sure they tick the consent checkbox")]
story += warn_box(
    "Paula only activates for users who give WhatsApp consent at registration. Walk users through the "
    "registration screen and confirm they check the WhatsApp opt-in box. Without it, Paula cannot contact them "
    "and they lose the proactive reminders that drive repeat payments."
)
story += [hr()]

# ── 12. TARGETS ───────────────────────────────────────────────────────────────
story += [p("12. Suggested Daily Targets (Launch Phase)", STY_H1)]
story += tbl(
    headers=["Metric", "Minimum Goal", "Ideal Goal"],
    rows=[
        ("People approached", "20", "40+"),
        ("Demos completed", "8", "15+"),
        ("Registrations", "2", "5+"),
        ("WhatsApp links shared", "10", "20+"),
    ],
    col_widths=[3.2, 1.5, 1.5],
)
story += [hr()]

# ── 13. KEY FACTS ─────────────────────────────────────────────────────────────
story += [p("13. Key Facts to Know by Heart", STY_H1)]
story += tbl(
    headers=["Fact", "Value"],
    rows=[
        (Paragraph("<b>Platform fee</b>", STY_TBL_BOLD),
         "$25 MXN flat per transaction — shown before confirmation"),
        (Paragraph("<b>Signup bonus</b>", STY_TBL_BOLD),
         "$150 MXN credited to wallet — unlocked on first payment"),
        ("Minimum OXXO deposit", "$50 MXN"),
        ("Balance loading (card)", "In-app — instant, no OXXO needed"),
        ("Credit time (OXXO cash)", "Minutes in most cases (max 24 hrs)"),
        ("Services available",
         "50+ including CFE, Telmex, Izzi, Telcel, AT&T, Netflix, Google Play, Starlink, and more"),
        ("Water bills — PV", "\u2714 SIAPA Jalisco (Guadalajara) + SEAPAL Vallarta available"),
        ("Water bills — Nayarit",
         Paragraph("\u26a0\ufe0f NOT available (CAPA not in catalog — coming soon)", STY_TBL_BODY)),
        (Paragraph("<b>Your commission</b>", STY_TBL_BOLD),
         "$5 MXN per confirmed bill payment by your users (7-day hold)"),
        ("Paula AI assistant",
         "Free for every user on WhatsApp — user must opt in at registration"),
        ("User support", "soporte@pagoyamx.com — always escalate, never handle complaints yourself"),
        ("Website", "pagoyamx.com"),
        ("Rent payments", "pagoseguromx.com (linked from pagoyamx.com homepage)"),
    ],
    col_widths=[2.4, 4.3],
)
story += [hr()]

# ── 14. DO'S AND DON'TS ───────────────────────────────────────────────────────
story += [p("14. Do's and Don'ts", STY_H1)]
story += tbl(
    headers=["DO \u2713", "DON'T \u2717"],
    rows=[
        ("Be honest about costs ($25 MXN fee)",
         Paragraph("Quote <b>$15 MXN</b> — that fee is incorrect and out of date", STY_TBL_BODY)),
        ("Lead with the $150 MXN bonus — it's your strongest opener",
         "Promise features that don't exist in the app"),
        ("Ask if they're banked or cash-first before starting demo",
         "Assume everyone needs OXXO — many in PVR and Nayarit have cards"),
        ("Confirm users tick the WhatsApp opt-in checkbox during registration",
         "Skip the consent step — Paula cannot contact the user without it"),
        ("Show the app on your phone if customer has no internet",
         "Accept money from customers under any circumstance"),
        ("Share the link via WhatsApp if they don't register on the spot",
         "Give your personal number as official tech support"),
        ("Follow up on warm leads who didn't complete registration",
         "Pressure or badger anyone who is clearly not interested"),
        ("Report your daily activity to your Regional Lead",
         "Share internal or other users' personal data"),
        ("Operate only in your assigned territory zone",
         "Operate in another rep's zone without coordination"),
        ("Escalate all complaints immediately to soporte@pagoyamx.com",
         "Try to handle customer disputes yourself"),
        ("Tell Nayarit users that water bills are coming soon",
         "Promise Nayarit water bill payment — CAPA is not in the catalog yet"),
    ],
    col_widths=[3.35, 3.35],
)
story += [hr()]

# ── 15. SUPPORT MATERIALS ─────────────────────────────────────────────────────
story += [p("15. Support Materials", STY_H1)]
story += [bullet("Business cards with QR code linking to pagoyamx.com")]
story += [bullet("Informational flyers — printed and digital (QR leads directly to registration)")]
story += [bullet("Access to the field team WhatsApp group (your coordinator will add you at onboarding)")]
story += [bullet("This onboarding guide in digital format")]
story += [bullet("Demo account in the app to walk through the full payment flow")]
story += [bullet("Zone map with assigned territory boundaries (provided by your Regional Lead)")]
story += [hr()]

# ── 16. CONTACT ───────────────────────────────────────────────────────────────
story += [p("16. Contact & Support", STY_H1)]
story += tbl(
    headers=["Contact", "Use For"],
    rows=[
        ("soporte@pagoyamx.com", "Customer complaints, user issues, escalations"),
        ("pagoyamx.com", "Registration, all user-facing transactions"),
        ("pagoseguromx.com", "Rent payment questions"),
        ("Field team WhatsApp group",
         "Daily rep activity reports, zone coordination, material requests"),
        ("Your Regional Lead",
         "Zone assignments, commission questions, performance issues"),
    ],
    col_widths=[2.4, 4.3],
)
story += warn_box(
    "If a user makes a formal complaint, do NOT try to handle it yourself. "
    "Escalate immediately to soporte@pagoyamx.com with the user's phone number (last 4 digits only) "
    "and a description of the issue. Do not share users' full phone numbers or personal details "
    "via the field team WhatsApp group."
)

# ── Build PDF ──────────────────────────────────────────────────────────────────
out_path = "attached_assets/PagoYa_Street_Team_Onboarding_EN_v4.pdf"
doc = SimpleDocTemplate(
    out_path,
    pagesize=letter,
    leftMargin=L_MARGIN,
    rightMargin=R_MARGIN,
    topMargin=T_MARGIN,
    bottomMargin=B_MARGIN + 0.2*inch,
    title="PagoYa Street Team Onboarding Guide v4",
    author="PagoYa Technologies SA de CV",
)
doc.build(story, onFirstPage=on_first_page, onLaterPages=on_page)
print(f"PDF saved: {out_path}")
