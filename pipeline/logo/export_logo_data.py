"""Data for the web app's logo generator (Logo app menu).

Writes web/public/data/logo/:
  kern.json       kerning pairs of Gabarito Black for printable Latin characters, in font units
                  (opentype.js cannot read this font's GPOS extension lookups, so the pairs are
                  flattened here with fontTools)
  lucide.json     pictogram library: [name, inner SVG markup, tags] from lucide-static
  asli/*.png      the original product logos, downscaled, for side-by-side comparison
  LICENSES.txt    Lucide (ISC) and Gabarito (SIL OFL 1.1) notices

Run from the project root:  python pipeline/logo/export_logo_data.py
Needs: fonttools, pillow, and `npm install` in web/ (lucide-static, @fontsource/gabarito).
"""

from __future__ import annotations

import json
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
WEB = ROOT / "web"
OUT = WEB / "public" / "data" / "logo"
FONT_DIR = WEB / "node_modules" / "@fontsource" / "gabarito" / "files"
LUCIDE = WEB / "node_modules" / "lucide-static"
ORIGINALS = ROOT / "Logo app produk"

CHARS = [chr(c) for c in range(0x20, 0x7F)] + list("ÀÁÂÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÖÙÚÛÜàáâäåçèéêëìíîïñòóôöùúûü")


def pair_values(font: TTFont) -> dict[tuple[str, str], int]:
    """(left glyph, right glyph) -> x advance adjustment, from every PairPos subtable of 'kern'."""
    gpos = font["GPOS"].table
    kern_lookups: set[int] = set()
    for rec in gpos.FeatureList.FeatureRecord:
        if rec.FeatureTag == "kern":
            kern_lookups.update(rec.Feature.LookupListIndex)
    out: dict[tuple[str, str], int] = {}
    glyphs = font.getGlyphOrder()
    for li in sorted(kern_lookups):
        lookup = gpos.LookupList.Lookup[li]
        for st in lookup.SubTable:
            if lookup.LookupType == 9:
                st = st.ExtSubTable
            if getattr(st, "LookupType", 2) != 2 and not hasattr(st, "Format"):
                continue
            cov = st.Coverage.glyphs
            if st.Format == 1:
                for first, pset in zip(cov, st.PairSet):
                    for rec in pset.PairValueRecord:
                        v = getattr(rec.Value1, "XAdvance", 0) if rec.Value1 else 0
                        if v:
                            out.setdefault((first, rec.SecondGlyph), v)
            elif st.Format == 2:
                cd1 = st.ClassDef1.classDefs
                cd2 = st.ClassDef2.classDefs
                for first in cov:
                    c1 = cd1.get(first, 0)
                    row = st.Class1Record[c1].Class2Record
                    for second in glyphs:
                        c2 = cd2.get(second, 0)
                        rec = row[c2]
                        v = getattr(rec.Value1, "XAdvance", 0) if rec.Value1 else 0
                        if v:
                            out.setdefault((first, second), v)
    return out


def export_kerning() -> None:
    pairs: dict[str, int] = {}
    for name in ["gabarito-latin-900-normal.woff", "gabarito-latin-ext-900-normal.woff"]:
        font = TTFont(FONT_DIR / name)
        cmap = font.getBestCmap()
        by_char = {ch: cmap.get(ord(ch)) for ch in CHARS if cmap.get(ord(ch))}
        values = pair_values(font)
        for a, ga in by_char.items():
            for b, gb in by_char.items():
                v = values.get((ga, gb))
                if v:
                    pairs.setdefault(a + b, v)
    (OUT / "kern.json").write_text(json.dumps(pairs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"kern.json: {len(pairs)} pairs")


def attr_markup(tag: str, attrs: dict[str, str]) -> str:
    parts = " ".join(f'{k}="{v}"' for k, v in attrs.items() if k != "key")
    return f"<{tag} {parts}/>"


def export_lucide() -> None:
    nodes = json.loads((LUCIDE / "icon-nodes.json").read_text(encoding="utf-8"))
    tags = json.loads((LUCIDE / "tags.json").read_text(encoding="utf-8"))
    rows = []
    for name in sorted(nodes):
        markup = "".join(attr_markup(tag, attrs) for tag, attrs in nodes[name])
        rows.append([name, markup, tags.get(name, [])])
    (OUT / "lucide.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"lucide.json: {len(rows)} icons")


ORIGINAL_FILES = {
    "freelance": ("logo product freelance.png", "logo + text.png"),
    "knowledge": ("logo product knowledge.png", "logo + text product knowledge.png"),
    "momentum": ("logo product momentum.png", "logo + text product momentum.png"),
    "track": ("logo product track.png", "logo + text product track.png"),
}


def export_originals() -> None:
    dest = OUT / "asli"
    dest.mkdir(parents=True, exist_ok=True)
    for slug, (mark, lockup) in ORIGINAL_FILES.items():
        for kind, name, width in [("mark", mark, 512), ("lockup", lockup, 1086)]:
            im = Image.open(ORIGINALS / name).convert("RGBA")
            bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
            if bbox:
                pad = int(0.04 * max(im.size))
                x0, y0, x1, y1 = bbox
                im = im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
            scale = width / im.width
            im = im.resize((width, round(im.height * scale)), Image.LANCZOS)
            im.save(dest / f"{slug}_{kind}.png", optimize=True)
    print(f"asli/: {len(ORIGINAL_FILES) * 2} files")


def export_licenses() -> None:
    lucide = (LUCIDE / "LICENSE").read_text(encoding="utf-8")
    ofl = (WEB / "node_modules" / "@fontsource" / "gabarito" / "LICENSE").read_text(encoding="utf-8")
    text = (
        "Pictograms: Lucide (https://lucide.dev), ISC License\n\n" + lucide.strip() + "\n\n" + "-" * 60 + "\n\n"
        "Font: Gabarito (https://github.com/naipefoundry/gabarito), SIL Open Font License 1.1\n\n" + ofl.strip() + "\n"
    )
    (OUT / "LICENSES.txt").write_text(text, encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    export_kerning()
    export_lucide()
    export_originals()
    export_licenses()


if __name__ == "__main__":
    main()
