"""Diagnostic sheet: region map + a swatch table of each region's color per brand."""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from common import load_json, path

FONT = "C:/Windows/Fonts/arial.ttf"


def sheet(glyph, out_file):
    model = load_json(f"build/models/{glyph}.json")
    region = np.array(Image.open(path("build", "models", f"{glyph}.regions.png"))).astype(np.int32) - 1
    regions = sorted(model["regions"], key=lambda r: -r["area"])
    brands = list(regions[0]["colors"])
    rng = np.random.default_rng(7)
    lut = rng.integers(40, 230, size=(region.max() + 2, 3), dtype=np.uint8)
    lut[0] = 255
    prev = Image.fromarray(lut[region + 1]).resize((360, 360), Image.NEAREST)
    cell, lw, top = 34, 70, 120
    W = 380 + lw + cell * len(brands) + 20
    H = max(400, top + cell * len(regions) + 20)
    img = Image.new("RGB", (W, H), (250, 250, 250))
    d = ImageDraw.Draw(img)
    f, fs = ImageFont.truetype(FONT, 13), ImageFont.truetype(FONT, 10)
    img.paste(prev, (10, 30))
    d.text((10, 8), f"{glyph}: {len(regions)} regions", font=f, fill=(0, 0, 0))
    x0 = 380 + lw
    for j, b in enumerate(brands):
        tx = Image.new("RGBA", (110, 14), (0, 0, 0, 0))
        ImageDraw.Draw(tx).text((0, 0), b, font=fs, fill=(0, 0, 0))
        tx = tx.rotate(60, expand=True)
        img.paste(tx, (x0 + j * cell, top - tx.height - 2), tx)
    for i, r in enumerate(regions):
        y = top + i * cell
        c = tuple(int(v) for v in lut[r["id"] + 1])
        d.rectangle([380, y + 4, 380 + 22, y + cell - 6], fill=c, outline=(120, 120, 120))
        d.text((380 + 28, y + 10), f"{r['area'] * 100:.1f}%", font=fs, fill=(0, 0, 0))
        for j, b in enumerate(brands):
            hx = r["colors"][b]["hex"]
            d.rectangle([x0 + j * cell + 2, y + 2, x0 + (j + 1) * cell - 2, y + cell - 2], fill=hx, outline=(160, 160, 160))
            if r["colors"][b]["share"] < 0.8:
                d.text((x0 + j * cell + 8, y + 10), "?", font=f, fill=(255, 0, 0))
    img.save(out_file)


if __name__ == "__main__":
    for g in sys.argv[1:]:
        sheet(g, path("build", "previews", f"{g}.sheet.png"))
