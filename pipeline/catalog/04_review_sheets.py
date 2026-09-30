"""Step 4: contact sheets from catalog/glyphs.json.

  catalog/review/<kategori>.png               for human validators: one image per kategori;
                                              each glyph = id + nama + up to 6 instances
  build/catalog_review/final_<kategori>_NN.png  (--all) every instance of every glyph, paginated

Instances with a `varian` note get an orange corner badge (same glyph drawn with another
colour distribution or a slightly redrawn detail).
"""
from __future__ import annotations

import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (BRAND_SHORT, BUILD_DIR, GLYPHS_PATH, REVIEW_DIR, checkerboard, font,  # noqa: E402
                    load_rgba, read_json, wrap_text)
from glyph_meta import KATEGORI  # noqa: E402

IMG = 128          # thumbnail box
LAB_H = 34         # label area under each thumbnail
GAP = 6
HEAD_H = 60        # glyph header: id / nama / meta
PAGE_W = 1740
TITLE_H = 58

_thumb_cache: dict[str, Image.Image] = {}


def thumb(rel: str) -> Image.Image:
    if rel not in _thumb_cache:
        im = load_rgba(rel)
        bb = im.getchannel("A").point(lambda v: 255 if v > 40 else 0).getbbox()
        if bb:
            im = im.crop(bb)
        im.thumbnail((IMG - 12, IMG - 12), Image.LANCZOS)
        _thumb_cache[rel] = im
    return _thumb_cache[rel]


def pick_instances(gl: dict, limit: int | None) -> list[dict]:
    insts = gl["instances"]
    if limit is None or len(insts) <= limit:
        return insts
    chosen: list[dict] = []
    seen_brand: set[str] = set()
    # visual variants first (validators should see them), then one per brand, then the rest
    for it in insts:
        if it.get("varian") and len(chosen) < min(3, limit):
            chosen.append(it)
            seen_brand.add(it["brand"])
    for it in insts:
        if len(chosen) >= limit:
            break
        if it not in chosen and it["brand"] not in seen_brand:
            chosen.append(it)
            seen_brand.add(it["brand"])
    for it in insts:
        if len(chosen) >= limit:
            break
        if it not in chosen:
            chosen.append(it)
    order = {id(it): k for k, it in enumerate(insts)}
    return sorted(chosen, key=lambda it: order[id(it)])


def cell(it: dict) -> Image.Image:
    c = checkerboard(IMG, IMG + LAB_H, cell=8, c1=(255, 255, 255), c2=(236, 236, 236))
    th = thumb(it["file"])
    c.paste(th, ((IMG - th.width) // 2, (IMG - th.height) // 2), th)
    d = ImageDraw.Draw(c)
    d.rectangle([0, IMG, IMG, IMG + LAB_H], fill=(255, 255, 255))
    fb, fr = font(11, True), font(11)
    short = BRAND_SHORT[it["brand"]]
    d.text((3, IMG + 2), short, fill=(20, 40, 120), font=fb)
    name = it["file"].split("/", 1)[1]
    x0 = 3 + int(d.textlength(short + " ", font=fb))
    first = ""
    for ch in name:                      # fill line 1 after the brand tag
        if d.textlength(first + ch, font=fr) > IMG - x0 - 2:
            break
        first += ch
    d.text((x0, IMG + 2), first, fill=(0, 0, 0), font=fr)
    rest = name[len(first):]
    if rest:
        d.text((3, IMG + 17), wrap_text(d, rest, fr, IMG - 6, 1)[0], fill=(0, 0, 0), font=fr)
    if it.get("varian"):
        tw = int(d.textlength("varian", font=font(10, True)))
        d.rectangle([IMG - tw - 7, 0, IMG, 14], fill=(200, 60, 0))
        d.text((IMG - tw - 4, 1), "varian", fill=(255, 255, 255), font=font(10, True))
    d.rectangle([0, 0, IMG - 1, IMG + LAB_H - 1], outline=(185, 185, 185))
    return c


def block(gl: dict, maxcols: int, limit: int | None) -> Image.Image:
    shown = pick_instances(gl, limit)
    ncols = max(2, min(maxcols, len(shown)))
    rows = (len(shown) + ncols - 1) // ncols
    w = GAP + ncols * (IMG + GAP)
    h = HEAD_H + rows * (IMG + LAB_H + GAP) + GAP
    b = Image.new("RGB", (w, h), (248, 249, 252))
    d = ImageDraw.Draw(b)
    d.rectangle([0, 0, w - 1, h - 1], outline=(150, 160, 190))
    d.rectangle([1, 1, w - 2, HEAD_H - 2], fill=(226, 232, 245))
    fid, fsm = font(16, True), font(12)
    extra = len(gl["instances"]) - len(shown)
    tipe = " · LOGO (jangan diwarnai ulang)" if gl["tipe"] == "logo" else ""
    meta = f'{len(gl["brands"])} brand, {len(gl["instances"])} file' + \
           (f" (+{extra} tidak ditampilkan)" if extra else "") + tipe
    d.text((GAP, 3), wrap_text(d, gl["id"], fid, w - 2 * GAP, 1)[0], fill=(10, 20, 80), font=fid)
    d.text((GAP, 23), wrap_text(d, gl["nama"], fsm, w - 2 * GAP, 1)[0], fill=(30, 30, 30), font=fsm)
    d.text((GAP, 40), wrap_text(d, meta, fsm, w - 2 * GAP, 1)[0], fill=(90, 90, 110), font=fsm)
    for k, it in enumerate(shown):
        r, c = divmod(k, ncols)
        b.paste(cell(it), (GAP + c * (IMG + GAP), HEAD_H + GAP // 2 + r * (IMG + LAB_H + GAP)))
    return b


def render_kategori(kat: str, glyphs: list[dict], limit: int | None, out: Path, subtitle: str,
                    maxcols: int, max_h: int | None = None):
    """Flow layout; with max_h the result is split into pages <out>_NN.png."""
    blocks = [block(g, maxcols, limit) for g in glyphs]
    rows, cur, x = [], [], GAP
    for b in blocks:
        if cur and x + b.width + GAP > PAGE_W:
            rows.append(cur)
            cur, x = [], GAP
        cur.append(b)
        x += b.width + GAP
    rows.append(cur)
    pages, pcur, h = [], [], TITLE_H
    for r in rows:
        rh = max(b.height for b in r) + GAP
        if max_h and pcur and h + rh > max_h:
            pages.append(pcur)
            pcur, h = [], TITLE_H
        pcur.append(r)
        h += rh
    pages.append(pcur)
    n_files = sum(len(g["instances"]) for g in glyphs)
    written = []
    for p_i, prow in enumerate(pages):
        H = TITLE_H + sum(max(b.height for b in r) + GAP for r in prow) + GAP
        page = Image.new("RGB", (PAGE_W, H), (255, 255, 255))
        d = ImageDraw.Draw(page)
        d.rectangle([0, 0, PAGE_W, TITLE_H - 8], fill=(30, 50, 110))
        title = f"Kategori: {kat}" + (f"  (hal. {p_i + 1}/{len(pages)})" if len(pages) > 1 else "")
        d.text((12, 6), title, fill=(255, 255, 255), font=font(20, True))
        d.text((12, 31), f"{len(glyphs)} glyph, {n_files} file  |  {subtitle}", fill=(220, 225, 240),
               font=font(12))
        y = TITLE_H
        for r in prow:
            x = GAP
            for b in r:
                page.paste(b, (x, y))
                x += b.width + GAP
            y += max(b.height for b in r) + GAP
        path = out if len(pages) == 1 else out.with_name(f"{out.stem}_{p_i + 1:02d}{out.suffix}")
        path.parent.mkdir(parents=True, exist_ok=True)
        page.save(path, optimize=True)
        written.append((path, page.size))
    return written


def main():
    full = "--all" in sys.argv
    cat = read_json(GLYPHS_PATH)
    glyphs = cat["glyphs"]
    need = [it["file"] for g in glyphs for it in (g["instances"] if full else pick_instances(g, 6))]
    with ThreadPoolExecutor(max_workers=8) as ex:     # warm the thumbnail cache
        list(ex.map(thumb, need))
    by_kat = {k: [g for g in glyphs if g["kategori"] == k] for k in KATEGORI}
    target = BUILD_DIR if full else REVIEW_DIR
    for old in target.glob("final_*.png" if full else "*.png"):
        old.unlink()
    legend = "badge 'varian' = gambar sama dengan distribusi warna atau detail sedikit berbeda"
    for k, gs in by_kat.items():
        if not gs:
            continue
        if full:
            res = render_kategori(k, gs, None, BUILD_DIR / f"final_{k}.png",
                                  "SEMUA instance (untuk verifikasi)  |  " + legend, maxcols=8, max_h=1900)
        else:
            sub = f"maks. 6 instance per glyph, daftar lengkap di catalog/glyphs.json  |  {legend}"
            res = render_kategori(k, gs, 6, REVIEW_DIR / f"{k}.png", sub, maxcols=6)
        for path, size in res:
            print(path, size)


if __name__ == "__main__":
    main()
