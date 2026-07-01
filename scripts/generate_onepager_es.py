from fpdf import FPDF
from fpdf.enums import XPos, YPos

class OnePager(FPDF):
    def header(self): pass
    def footer(self):  pass

pdf = OnePager(orientation="P", unit="mm", format="A4")
pdf.add_page()
pdf.set_auto_page_break(auto=False)

W, H = 210, 297

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

def hline(y):
    pdf.set_draw_color(210, 235, 220)
    pdf.set_line_width(0.3)
    pdf.line(14, y, 196, y)

def section_head(x, y, text):
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(0, 84, 50)
    pdf.set_xy(x, y)
    pdf.cell(0, 6, text)

def bullet(x, y, text, w=86):
    return mcell(x, y, w, 4.8, "- " + text, size=9, rgb=(60,60,60))

# ── Header band ──────────────────────────────────────────────────────────────
pdf.set_fill_color(0, 84, 50)
pdf.rect(0, 0, W, 52, "F")

pdf.set_fill_color(0, 200, 117)
pdf.rect(0, 48, W, 4, "F")

# ── Wordmark ─────────────────────────────────────────────────────────────────
cell(14, 10, 0, 12, "PagoYa", style="B", size=32, rgb=(255,255,255))
cell(14, 23,  0,  6, "El monedero movil WhatsApp-first para mexicanos no bancarizados",
     size=11, rgb=(200,240,220))
cell(14, 31,  0,  5, "pagoyamx.com", size=9.5, rgb=(160,220,190))

# ── Tagline ──────────────────────────────────────────────────────────────────
cell(14, 58, 0, 7, "Paga cualquier servicio en 2 minutos. Sin cuenta bancaria.",
     style="B", size=13, rgb=(0,84,50))

mcell(14, 67, 182, 5,
    "PagoYa permite a los mexicanos no bancarizados pagar CFE, Telmex, Izzi, OXXO, gas, agua "
    "y mas de 30 empresas directamente desde WhatsApp o nuestra app. Los usuarios cargan su "
    "monedero con efectivo en OXXO o transferencia SPEI, y pagan cualquier recibo al instante "
    "-- sin tarjeta, sin sucursal, sin papeleos.",
    size=10, rgb=(80,80,80))

hline(87)

# ── Stats ─────────────────────────────────────────────────────────────────────
stats = [
    ("30+",      "Empresas de\nservicios"),
    ("$150 MXN", "Bono de\nbienvenida"),
    ("2 min",    "Tiempo promedio\nde pago"),
    ("$25 MXN",  "Comision fija\npor pago"),
]
col_w = (W - 28) / 4
for i, (val, lbl) in enumerate(stats):
    x = 14 + i * col_w
    cell(x, 91, col_w, 9, val, style="B", size=18, rgb=(0,158,117), align="C")
    mcell(x, 101, col_w, 4, lbl, size=8, rgb=(120,120,120), align="C")

hline(113)

# ── Two-column body ───────────────────────────────────────────────────────────
section_head(14, 118, "El Problema")
y = 126
for item in [
    "57 millones de mexicanos no tienen cuenta bancaria -- invisibles para las finanzas tradicionales",
    "Pagar un recibo de CFE o Telmex implica un camion hasta OXXO y una fila con efectivo",
    "El BNPL para servicios basicos no existe para este segmento",
    "Sin historial de pagos = sin score crediticio = sin acceso a credito ni seguros",
]:
    y = bullet(14, y, item) + 1

section_head(14, y + 3, "Nuestra Solucion")
y2 = y + 11
for item in [
    "Chatbot WhatsApp + app movil: paga cualquier recibo en 2 minutos",
    "Carga tu monedero con efectivo en OXXO o por SPEI -- sin cuenta bancaria",
    "Predictive Trust Index (PTI): score crediticio de 7 dimensiones basado en comportamiento de pago",
    "Bono de $150 MXN al registro impulsa la activacion rapida",
]:
    y2 = bullet(14, y2, item) + 1

section_head(110, 118, "Oportunidad de Alianza BNPL")
yr = 126
for item in [
    "Los pagos de servicios son recurrentes y predecibles -- menor riesgo que el e-commerce",
    "Ticket promedio $400-$1,500 MXN: el rango ideal para BNPL",
    "PagoYa no asume riesgo crediticio -- Kueski aprueba, liquida y cobra",
    "Score PTI disponible como senal complementaria de originacion via API",
    "Comision de distribucion por credito activado -- modelo de revenue share estandar",
    "Segmento nuevo: mexicanos no bancarizados que no llegan por Amazon ni Adidas",
]:
    yr = bullet(110, yr, item, w=86) + 1

# ── Billers strip ─────────────────────────────────────────────────────────────
bot = max(y2, yr) + 6
hline(bot)

cell(14, bot + 4, 38, 5, "Empresas activas:", style="B", size=8.5, rgb=(0,84,50))
cell(52, bot + 4, 0,  5,
    "CFE  *  Telmex  *  Izzi  *  Telcel  *  AT&T  *  OXXO  *  Movistar  *  "
    "Ecogas  *  Naturgy  *  Mexicana de Gas  *  Infonavit  *  SADM  *  30+ mas",
    size=8.5, rgb=(80,80,80))

# ── PTI box ───────────────────────────────────────────────────────────────────
pti_y = bot + 14
pdf.set_fill_color(240, 250, 245)
pdf.set_draw_color(0, 158, 117)
pdf.set_line_width(0.4)
pdf.rect(14, pti_y, 182, 22, "FD")

cell(18, pti_y + 3, 0, 5,
    "Predictive Trust Index (PTI) -- Nuestra Ventaja en Originacion",
    style="B", size=9, rgb=(0,84,50))
cell(18, pti_y + 9, 170, 5,
    "Score 0-100 en 7 dimensiones: KYC  *  racha de pagos  *  diversidad de servicios  *  "
    "misiones  *  saldo  *  proporcion carga/gasto  *  antiguedad de cuenta",
    size=8.5, rgb=(60,60,60))
cell(18, pti_y + 15, 0, 5,
    "Actualizado mensualmente. Disponible como senal API para originacion de socios.",
    size=8.5, rgb=(60,60,60))

# ── Footer ────────────────────────────────────────────────────────────────────
fy = pti_y + 28
pdf.set_fill_color(0, 84, 50)
pdf.rect(0, fy, W, H - fy, "F")

cell(14, fy + 6,  0, 6, "Hablemos de una alianza",
     style="B", size=10, rgb=(255,255,255))
cell(14, fy + 13, 0, 5,
    "pagoyamx.com  *  contacto@pagoyamx.com  *  Ciudad de Mexico, MX",
    size=9, rgb=(180,230,210))

pdf.output("pagoya_partnership_onepager_ES.pdf")
print("Done: pagoya_partnership_onepager_ES.pdf")
