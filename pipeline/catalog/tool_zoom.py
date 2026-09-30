"""Review helper: render groups of files side by side at a larger size.

usage: python tool_zoom.py OUT_NAME "12,44,72" "5,6,7" ...
Each quoted argument is one row of indices (see build/catalog_review/index.txt)
or '|'-separated relative paths. Output: build/catalog_review/zoom_<OUT_NAME>.png
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import BUILD_DIR, checkerboard, font, list_pngs, load_rgba, short_label  # noqa: E402

CELL = 250


def main():
    name = sys.argv[1]
    rows = sys.argv[2:]
    files = list_pngs()
    parsed = []
    for r in rows:
        if "|" in r or "/" in r:
            parsed.append([files.index(p) for p in r.split("|")])
        else:
            parsed.append([int(x) for x in r.split(",") if x.strip()])
    ncol = max(len(r) for r in parsed)
    W = ncol * (CELL + 6) + 6
    H = len(parsed) * (CELL + 36) + 6
    sheet = Image.new("RGB", (W, H), (255, 255, 255))
    for ri, row in enumerate(parsed):
        for ci, idx in enumerate(row):
            im = load_rgba(files[idx])
            bb = im.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
            if bb:
                im = im.crop(bb)
            im.thumbnail((CELL - 10, CELL - 10), Image.LANCZOS)
            cellim = checkerboard(CELL, CELL + 30, cell=10)
            cellim.paste(im, ((CELL - im.width) // 2, (CELL - im.height) // 2), im)
            d = ImageDraw.Draw(cellim)
            d.rectangle([0, CELL, CELL, CELL + 30], fill=(255, 255, 255))
            d.text((3, CELL + 2), f"{idx} {short_label(files[idx], 40)}", fill=(0, 0, 0), font=font(12))
            sheet.paste(cellim, (6 + ci * (CELL + 6), 6 + ri * (CELL + 36)))
    out = BUILD_DIR / f"zoom_{name}.png"
    sheet.save(out)
    print(out)


if __name__ == "__main__":
    main()
