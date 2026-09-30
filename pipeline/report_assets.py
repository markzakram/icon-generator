"""Images for the Phase 0 report, all made with the final setting (hybrid, alpha 0.25, power 8)."""
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import predict as P
import segment
from common import delta_e, hex_to_rgb, path, rgb_to_lab
from demo import LABELS, generate_set, save_outputs

ALPHA, POWER = 0.35, 8


def loo_compact(out_file):
    seed = segment.seed_instances()
    S = 112
    f = ImageFont.truetype(P.FONT, 12)
    fb = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 13)
    W = 130 + len(P.TEST_BRANDS) * (2 * S + 36)
    H = 56 + len(P.TEST_GLYPHS) * (S + 22)
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    for j, b in enumerate(P.TEST_BRANDS):
        x = 130 + j * (2 * S + 36)
        d.text((x + S, 14), b, font=fb, fill=(0, 0, 0), anchor="mm")
        d.text((x + S // 2, 36), "generate", font=f, fill=(90, 90, 90), anchor="mm")
        d.text((x + S + S // 2, 36), "asli", font=f, fill=(90, 90, 90), anchor="mm")
    results = []
    for i, g in enumerate(P.TEST_GLYPHS):
        y = 50 + i * (S + 22)
        d.text((10, y + S // 2 - 8), g, font=fb, fill=(0, 0, 0))
        for j, T in enumerate(P.TEST_BRANDS):
            ctx = P.context(exclude_glyph=g, exclude_brand=T)
            models, maps, rows, sim, colors, roles = ctx
            region, alpha, ref = maps[g]
            target = sorted([r for r in rows if r["glyph"] == g], key=lambda r: r["id"])
            preds = P.predict_hybrid(target, rows, T, sim, roles, alpha=ALPHA, power=POWER)
            gen = P.render(region, alpha, [p["hex"] for p in preds])
            orig, _, _ = segment.align(ref, segment.normalized(dict(seed[g])[T]))
            actual = P.actual_region_colors(orig, region, len(target))
            areas = np.array([r["area"] for r in target])
            ok = np.array([delta_e(rgb_to_lab(hex_to_rgb(p["hex"])), rgb_to_lab(hex_to_rgb(a))) < 10
                           for p, a in zip(preds, actual)])
            acc = float((areas * ok).sum() / areas.sum())
            results.append({"glyph": g, "brand": T, "area_correct": round(acc, 4)})
            x = 130 + j * (2 * S + 36)
            img.paste(P.thumb(gen, S), (x, y))
            img.paste(P.thumb(orig, S), (x + S, y))
            d.text((x + S, y + S + 9), f"{acc * 100:.0f}% area sama", font=f,
                   fill=(0, 120, 0) if acc >= 0.95 else (200, 0, 0), anchor="mm")
            print(f"{g:14s} {T:14s} {acc * 100:5.1f}%")
    img.save(out_file)
    return results


def doc_sheet(icons, out_file, S=190, pad=16, cols=8):
    f = ImageFont.truetype(P.FONT, 22)
    fs = ImageFont.truetype(P.FONT, 20)
    rows_n = (len(P.GLYPHS) + cols - 1) // cols
    W, H = cols * (S + pad) + pad, rows_n * (S + 74) + pad
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    for i, g in enumerate(P.GLYPHS):
        kind, im = icons[g]
        x, y = pad + (i % cols) * (S + pad), pad + (i // cols) * (S + 74)
        d.rounded_rectangle([x, y, x + S, y + S], radius=16,
                            fill=(255, 255, 255) if kind == "resmi" else (232, 241, 255),
                            outline=(225, 225, 225) if kind == "resmi" else (120, 160, 230), width=2)
        t = Image.fromarray(im).resize((S - 16, S - 16), Image.LANCZOS)
        img.paste(t, (x + 8, y + 8), t)
        d.text((x + S // 2, y + S + 20), LABELS[g], font=f, fill=(40, 40, 40), anchor="mm")
        d.text((x + S // 2, y + S + 48), kind, font=fs,
               fill=(130, 130, 130) if kind == "resmi" else (30, 90, 200), anchor="mm")
    img.resize((W // 2, H // 2), Image.LANCZOS).save(out_file, optimize=True)


if __name__ == "__main__":
    res = loo_compact(path("reports", "fase0", "loo_compact.png"))
    with open(path("reports", "fase0", "loo_compact_results.json"), "w", encoding="utf-8") as fh:
        json.dump(res, fh, indent=1)
    ctx = P.context()
    for key, T, ref in [("pcpm", "JadiPCPM", None), ("beasiswa_asn", "JadiBeasiswa", "JadiASN"),
                        ("beasiswa_pcpm", "JadiBeasiswa", "JadiPCPM")]:
        icons = generate_set(T, ctx, "hybrid", ALPHA, POWER, ref=ref)
        save_outputs(T, icons, "" if ref is None else f"_gaya_{ref[4:].lower()}")
        doc_sheet(icons, path("reports", "fase0", f"doc_set_{key}.png"))
    print("done")
