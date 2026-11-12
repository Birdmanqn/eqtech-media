#!/usr/bin/env python3
"""Genera la placa diaria de noticias de EQTech (1080x1350 JPEG).

Uso: python3 tools/make_post.py datos.json salida.jpg

datos.json:
{
  "fecha": "Viernes 13 de noviembre de 2026",
  "precios": [{"sym": "BTC", "precio": "$71.444", "cambio": "-3,3% 24 h"},
              {"sym": "ETH", "precio": "$2.003", "cambio": "+1,2% 24 h"}],
  "titulo_items": "Lo que movió al mercado",
  "items": [{"t": "Nvidia", "d": "Texto corto de una o dos líneas."}],
  "fuente": "Fuente de precios: CoinMarketCap, 13/11/2026, 07:45 (ART)."
}
Hasta 5 items. Un cambio que empieza con "+" sale en verde; con "-", en rojo.
"""
import json, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

W, H = 1080, 1350
BG = (14, 15, 18); CARD = (26, 28, 34); GOLD = (201, 162, 39); TEAL = (45, 212, 191)
IV = (244, 241, 234); MUT = (160, 156, 148); DIM = (110, 108, 104)
RED = (239, 90, 90); GRN = (70, 200, 140)
F = "/usr/share/fonts/opentype/inter/"


def font(name, size):
    return ImageFont.truetype(F + name, size)


def render(data, out):
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    # logo: tres barras ascendentes
    for i, h in enumerate([40, 70, 100]):
        d.rounded_rectangle([80 + i * 34, 150 - h, 104 + i * 34, 150], radius=4, fill=GOLD)
    d.text((200, 62), "EQTech", font=font("Inter-Bold.otf", 54), fill=IV)
    d.text((202, 124), "INVESTMENTS", font=font("Inter-Medium.otf", 24), fill=GOLD)
    d.text((80, 215), data.get("titulo", "Resumen de mercado"), font=font("Inter-Bold.otf", 64), fill=IV)
    d.text((80, 295), data["fecha"], font=font("Inter-Medium.otf", 32), fill=MUT)

    precios = data["precios"][:2]
    for i, p in enumerate(precios):
        x = 80 + i * 470
        d.rounded_rectangle([x, 370, x + 450, 540], radius=24, fill=CARD)
        d.text((x + 32, 392), p["sym"], font=font("Inter-Bold.otf", 30), fill=GOLD)
        d.text((x + 32, 434), p["precio"], font=font("Inter-Bold.otf", 56), fill=IV)
        ch = p.get("cambio", "")
        col = GRN if ch.strip().startswith("+") else RED if ch.strip()[:1] in "-−" else MUT
        d.text((x + 250, 400), ch, font=font("Inter-SemiBold.otf", 28), fill=col)

    d.text((80, 568), data.get("titulo_items", "Lo que movió al mercado"), font=font("Inter-Bold.otf", 38), fill=TEAL)

    items = data["items"][:5]
    # achica la letra hasta que entre todo arriba del pie
    for size in (28, 26, 24, 22):
        body = font("Inter-Regular.otf", size); bold = font("Inter-Bold.otf", size + 2)
        wrap = int(60 * 28 / size); lh = size + 8
        total = sum(38 + lh * len(textwrap.wrap(it["d"], wrap)) + 18 for it in items)
        if 625 + total <= 1235:
            break
    y = 625
    for it in items:
        lines = textwrap.wrap(it["d"], wrap)
        d.ellipse([84, y + 12, 100, y + 28], fill=GOLD)
        d.text((120, y), it["t"], font=bold, fill=IV)
        for j, line in enumerate(lines):
            d.text((120, y + 38 + j * lh), line, font=body, fill=MUT)
        y += 38 + lh * len(lines) + 18

    d.line([80, 1252, 1000, 1252], fill=(40, 42, 50), width=2)
    d.text((80, 1268), "Contenido informativo. No constituye recomendación de inversión.",
           font=font("Inter-Medium.otf", 24), fill=MUT)
    d.text((80, 1304), data.get("fuente", ""), font=font("Inter-Regular.otf", 22), fill=DIM)
    im.save(out, "JPEG", quality=90, optimize=True)


if __name__ == "__main__":
    render(json.load(open(sys.argv[1], encoding="utf-8")), sys.argv[2])
    print("ok", sys.argv[2])
