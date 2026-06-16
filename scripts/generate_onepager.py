from fpdf import FPDF
from fpdf.enums import XPos, YPos

class OnePager(FPDF):
    def header(self): pass
    def footer(self):  pass

pdf = OnePager(orientation="P", unit="mm", format="A4")
pdf.add_page()
pdf.set_auto_page_break(auto=False)

W, H = 210, 297

# Helper shortcuts
NL  = {"new_x": XPos.LMARGIN, "new_y": YPos.NEXT}
STAY = {"new_x": XPos.RIGHT,   "new_y": YPos.TOP}

def cell(x, y, w, h, text, font="Helvetica", style="", size=10,
         rgb=(0,0,0), align="L", **kw):
    pdf.set_font(font, style, size)
    pdf.set_text_color(*rgb)
    pdf.set_xy(x, y)
    pdf.cell(w, h, text, align=align, **kw)

def mcell(x, y, w, h, text, font="Helvetica", style="", size=10,
          rgb=(0,0,0), align="L"):
    pdf.set_font(font, style, size)
    pdf.set_text_color(*rgb)
    pdf.set_xy(x, y)
    pdf.multi_cell(w, h, text, align=align)
    return pdf.get_y()

def line(y):
    pdf.set_draw_color(210, 235, 220)
    pdf.set_line_width(0.3)
    pdf.line(14, y, 196, y)

def section_head(x, y, text):
    cell(x, y, 0, 6, text, style="B", size=10, rgb=(0,84,50), **NL)

def bullet(x, y, text, w=86):
    return mcell(x, y, w, 4.8, "- " + text, size=9, rgb=(60,60,60))

# ── Dark green header band ───────────────────────────────────────────────────
pdf.set_fill_color(0, 84, 50)
pdf.rect(0, 0, W, 52, "F")

# ── Bright accent strip ──────────────────────────────────────────────────────
pdf.set_fill_color(0, 200, 117)
pdf.rect(0, 48, W, 4, "F")

# ── Wordmark ─────────────────────────────────────────────────────────────────
cell(14, 10, 0, 12, "PagoYa", style="B", size=32, rgb=(255,255,255))
cell(14, 23,  0,  6, "Mexico's WhatsApp-first mobile wallet for unbanked users",
     size=11, rgb=(200,240,220))
cell(14, 31,  0,  5, "pagoyamx.com", size=9.5, rgb=(160,220,190))

# ── Tagline ──────────────────────────────────────────────────────────────────
cell(14, 58, 0, 7, "Pay any bill in 2 minutes. No bank account needed.",
     style="B", size=13, rgb=(0,84,50))

mcell(14, 67, 182, 5,
    "PagoYa lets unbanked Mexicans pay CFE, Telmex, Izzi, OXXO, gas, water, and 30+ other "
    "billers directly from WhatsApp or our mobile app. Users load their wallet via OXXO cash "
    "or SPEI bank transfer, then pay any bill instantly -- no card, no branch, no paperwork.",
    size=10, rgb=(80,80,80))

line(87)

# ── Stats row ────────────────────────────────────────────────────────────────
stats = [
    ("30+",      "Billers &\nservices"),
    ("$150 MXN", "Sign-up\nbonus"),
    ("2 min",    "Avg. bill\npayment time"),
    ("$25 MXN",  "Flat fee\nper payment"),
]
col_w = (W - 28) / 4
for i, (val, lbl) in enumerate(stats):
    x = 14 + i * col_w
    cell(x, 91, col_w, 9, val, style="B", size=18, rgb=(0,158,117), align="C")
    mcell(x, 101, col_w, 4, lbl, size=8, rgb=(120,120,120), align="C")

line(113)

# ── Two-column body ───────────────────────────────────────────────────────────
section_head(14, 118, "The Problem")
y = 126
for item in [
    "57M Mexicans are unbanked -- invisible to traditional finance",
    "Paying a CFE or Telmex bill means a bus ride to OXXO and a cash queue",
    "BNPL for essential services does not exist for this segment",
    "No payment history = no credit score = no access to loans or insurance",
]:
    y = bullet(14, y, item) + 1

section_head(14, y + 3, "Our Solution")
y2 = y + 11
for item in [
    "WhatsApp chatbot + mobile app: pay any bill in 2 minutes",
    "Load wallet via OXXO cash or SPEI -- zero bank account required",
    "PagoYa Trust Index (PTI): 7-dimension credit score built from payment behavior",
    "$150 MXN sign-up bonus drives rapid activation",
]:
    y2 = bullet(14, y2, item) + 1

section_head(110, 118, "BNPL Partnership Opportunity")
yr = 126
for item in [
    "Bill payments are recurring & predictable -- lower risk than e-commerce",
    "Avg. bill size $400-$1,500 MXN: squarely in BNPL territory",
    "PagoYa bears zero credit risk -- Kueski approves, settles, collects",
    "PTI score available as supplemental underwriting signal via API",
    "Distribution fee per activated loan -- standard rev-share model",
    "Net-new segment: unbanked Mexicans not reachable via Amazon or Adidas",
]:
    yr = bullet(110, yr, item, w=86) + 1

# ── Billers strip ────────────────────────────────────────────────────────────
bot = max(y2, yr) + 6
line(bot)

cell(14, bot + 4, 32, 5, "Active billers:", style="B", size=8.5, rgb=(0,84,50))
cell(46, bot + 4, 0, 5,
    "CFE  *  Telmex  *  Izzi  *  Telcel  *  AT&T  *  OXXO  *  Movistar  *  "
    "Ecogas  *  Naturgy  *  Mexicana de Gas  *  Infonavit  *  SADM  *  30+ more",
    size=8.5, rgb=(80,80,80))

# ── PTI box ──────────────────────────────────────────────────────────────────
pti_y = bot + 14
pdf.set_fill_color(240, 250, 245)
pdf.set_draw_color(0, 158, 117)
pdf.set_line_width(0.4)
pdf.rect(14, pti_y, 182, 22, "FD")

cell(18, pti_y + 3, 0, 5,
    "PagoYa Trust Index (PTI) -- Our Underwriting Moat",
    style="B", size=9, rgb=(0,84,50))
cell(18, pti_y + 9, 170, 5,
    "7-dimension score (0-100): KYC  *  payment streak  *  biller diversity  *  "
    "missions  *  balance  *  load/spend ratio  *  account age",
    size=8.5, rgb=(60,60,60))
cell(18, pti_y + 15, 0, 5,
    "Updated monthly. Available as API signal for partner underwriting.",
    size=8.5, rgb=(60,60,60))

# ── Footer ────────────────────────────────────────────────────────────────────
fy = pti_y + 28
pdf.set_fill_color(0, 84, 50)
pdf.rect(0, fy, W, H - fy, "F")

cell(14, fy + 6,  0, 6, "Let's talk partnerships",
     style="B", size=10, rgb=(255,255,255))
cell(14, fy + 13, 0, 5,
    "pagoyamx.com  *  contacto@pagoyamx.com  *  Mexico City, MX",
    size=9, rgb=(180,230,210))

pdf.output("pagoya_partnership_onepager.pdf")
print("Done: pagoya_partnership_onepager.pdf")
