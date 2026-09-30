"""Phase 0 demo: generate icons that do not exist yet, following the output spec.

- JadiPCPM: full standard set; official icons are kept (existing-first), Info/Tips/Link are generated.
- JadiBeasiswa: full standard set in two style references (like JadiASN vs like JadiPCPM), which is
  exactly what the "Brand baru" screen will do for a new brand.

Usage: python pipeline/demo.py [method alpha power]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import predict as P
import segment
from common import BRANDS, brand_slug, path

OUT = path("reports", "fase0", "demo")
LABELS = {"materi": "Materi/Course", "tryout": "Tryout", "latsol": "Latsol", "rapor": "Rapor",
          "lapor_masalah": "Lapor masalah", "pdf": "PDF", "promo": "Promo", "kalender": "Kalender",
          "live_class": "Live class", "grup": "Grup", "journey": "Journey", "info": "Info", "tips": "Tips",
          "link": "Link", "drilling_soal": "Drilling soal", "kertas_soal": "Kertas soal"}


def styled_sim(sim, T, ref, keep=0.9):
    """T copies the style of `ref`: similarity 1 to ref, and ref's similarity to everyone else."""
    out = dict(sim)
    for b in BRANDS:
        out[(T, b)] = out[(b, T)] = 1.0 if b == ref else sim[(ref, b)] * keep
    out[(T, T)] = 1.0
    return out


def generate_set(T, ctx, method, alpha, power, ref=None):
    models, maps, rows, sim, colors, roles = ctx
    seed = segment.seed_instances()
    s = styled_sim(sim, T, ref) if ref else sim
    icons = {}
    for g in P.GLYPHS:
        official = dict(seed[g]).get(T)
        if T == "JadiPCPM" and g == "grup":
            official = "JadiPCPM/icon_Grup.png"   # PCPM's Grup uses the family drawing
        if official:
            icons[g] = ("resmi", segment.normalized(official))
            continue
        region, alpha_map, _ = maps[g]
        target = sorted([r for r in rows if r["glyph"] == g], key=lambda r: r["id"])
        if method == "hybrid":
            preds = P.predict_hybrid(target, rows, T, s, roles, alpha=alpha, power=power)
        else:
            preds = P.predict_roles(target, T, s, roles, power=power)
        icons[g] = ("generate", P.render(region, alpha_map, [p["hex"] for p in preds]))
    return icons


def save_outputs(T, icons, suffix=""):
    os.makedirs(OUT, exist_ok=True)
    for g, (kind, img) in icons.items():
        if kind != "generate":
            continue
        im = Image.fromarray(img)
        for size in (512, 256):
            im.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, f"{brand_slug(T)}{suffix}_{g}_{size}.png"))


def sheet(title, sets, out_file):
    """sets: list of (row label, icons dict)."""
    S, pad = 104, 8
    f = ImageFont.truetype(P.FONT, 11)
    fb = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 15)
    W = 150 + len(P.GLYPHS) * (S + pad)
    H = 70 + len(sets) * (S + 34)
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.text((12, 12), title, font=fb, fill=(0, 0, 0))
    for j, g in enumerate(P.GLYPHS):
        d.text((150 + j * (S + pad) + S // 2, 52), LABELS[g], font=f, fill=(70, 70, 70), anchor="mm")
    for i, (label, icons) in enumerate(sets):
        y = 64 + i * (S + 34)
        d.multiline_text((12, y + S // 2 - 14), label, font=ImageFont.truetype(P.FONT, 13), fill=(0, 0, 0), spacing=3)
        for j, g in enumerate(P.GLYPHS):
            kind, im = icons[g]
            x = 150 + j * (S + pad)
            bg = (255, 255, 255) if kind == "resmi" else (236, 244, 255)
            d.rounded_rectangle([x - 2, y - 2, x + S + 1, y + S + 1], radius=8, fill=bg)
            t = Image.fromarray(im).resize((S - 8, S - 8), Image.LANCZOS)
            img.paste(t, (x + 2, y + 2), t)
            d.text((x + S // 2, y + S + 10), kind, font=f,
                   fill=(120, 120, 120) if kind == "resmi" else (20, 90, 200), anchor="mm")
    img.save(out_file)


if __name__ == "__main__":
    method = sys.argv[1] if len(sys.argv) > 1 else "hybrid"
    alpha = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
    power = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    ctx = P.context()
    pcpm = generate_set("JadiPCPM", ctx, method, alpha, power)
    save_outputs("JadiPCPM", pcpm)
    sheet("JadiPCPM: 13 icon resmi + 3 hasil generate (latar biru)", [("JadiPCPM", pcpm)],
          os.path.join(OUT, "jadipcpm_set.png"))
    b_asn = generate_set("JadiBeasiswa", ctx, method, alpha, power, ref="JadiASN")
    b_pcpm = generate_set("JadiBeasiswa", ctx, method, alpha, power, ref="JadiPCPM")
    save_outputs("JadiBeasiswa", b_asn, "_gaya_asn")
    save_outputs("JadiBeasiswa", b_pcpm, "_gaya_pcpm")
    sheet("JadiBeasiswa: 1 icon resmi + 15 hasil generate, dua gaya referensi",
          [("Gaya seperti\nJadiASN", b_asn), ("Gaya seperti\nJadiPCPM", b_pcpm)],
          os.path.join(OUT, "jadibeasiswa_set.png"))
    print("demo written to", OUT)
