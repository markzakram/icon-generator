"""Shared helpers for the Phase-0 glyph catalog pipeline.

Only numpy, OpenCV and Pillow are used. Source PNGs are opened read-only;
nothing under the brand folders is ever written, moved or renamed.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
CATALOG_DIR = ROOT / "catalog"
REVIEW_DIR = CATALOG_DIR / "review"
BUILD_DIR = ROOT / "build" / "catalog_review"
SEED_PATH = CATALOG_DIR / "seed_standard16.json"
GLYPHS_PATH = CATALOG_DIR / "glyphs.json"

BRANDS = [
    "Cerebrum", "JadiASN", "JadiBUMN", "JadiBeasiswa", "JadiOJK", "JadiPCPM",
    "JadiPPG", "JadiPPPK", "JadiPolisi", "JadiPrajurit", "JadiSekdin",
    "Jago TPA", "Psikotes kerja", "TOEFL Academy",
]

BRAND_SHORT = {
    "Cerebrum": "CER", "JadiASN": "ASN", "JadiBUMN": "BUMN", "JadiBeasiswa": "BEA",
    "JadiOJK": "OJK", "JadiPCPM": "PCPM", "JadiPPG": "PPG", "JadiPPPK": "PPPK",
    "JadiPolisi": "POL", "JadiPrajurit": "PRA", "JadiSekdin": "SEK",
    "Jago TPA": "TPA", "Psikotes kerja": "PSI", "TOEFL Academy": "TOEFL",
}

SEED16 = [
    "materi", "tryout", "latsol", "rapor", "lapor_masalah", "pdf", "promo",
    "kalender", "live_class", "grup", "journey", "info", "tips", "link",
    "drilling_soal", "kertas_soal",
]


def list_pngs() -> list[str]:
    """All source PNGs as root-relative paths with forward slashes (exact names,
    including trailing spaces before the extension)."""
    out: list[str] = []
    for brand in BRANDS:
        base = ROOT / brand
        for dirpath, _dirs, files in os.walk(base):
            for fn in files:
                if fn.lower().endswith(".png"):
                    full = Path(dirpath) / fn
                    out.append(full.relative_to(ROOT).as_posix())
    return sorted(out)


def brand_of(rel: str) -> str:
    return rel.split("/", 1)[0]


def abs_path(rel: str) -> Path:
    return ROOT / Path(*rel.split("/"))


def load_rgba(rel: str) -> Image.Image:
    with Image.open(abs_path(rel)) as im:
        im.load()
        if im.mode != "RGBA":
            im = im.convert("RGBA")
        return im.copy()


def short_label(rel: str, maxlen: int = 30) -> str:
    brand = brand_of(rel)
    name = rel.split("/", 1)[1]
    if name.lower().endswith(".png"):
        name = name[:-4]
    s = f"{BRAND_SHORT[brand]}:{name}"
    return s if len(s) <= maxlen else s[: maxlen - 1] + "~"


_FONT_CACHE: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    key = ("bd" if bold else "rg", size)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]
    cands = (["arialbd.ttf", "segoeuib.ttf"] if bold else ["arial.ttf", "segoeui.ttf"])
    f = None
    for c in cands:
        p = Path("C:/Windows/Fonts") / c
        if p.exists():
            f = ImageFont.truetype(str(p), size)
            break
    if f is None:
        f = ImageFont.load_default(size=size)
    _FONT_CACHE[key] = f
    return f


def checkerboard(w: int, h: int, cell: int = 10,
                 c1=(255, 255, 255), c2=(232, 232, 232)) -> Image.Image:
    yy, xx = np.mgrid[0:h, 0:w]
    m = ((yy // cell + xx // cell) % 2).astype(bool)
    arr = np.empty((h, w, 3), np.uint8)
    arr[~m] = c1
    arr[m] = c2
    return Image.fromarray(arr, "RGB")


def thumb_path(idx: int) -> Path:
    return BUILD_DIR / "thumbs" / f"{idx:03d}.png"


def read_json(p: Path):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(p: Path, obj) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


def wrap_text(draw: ImageDraw.ImageDraw, text: str, fnt, max_w: int, max_lines: int = 2) -> list[str]:
    """Greedy character wrap that keeps at most max_lines lines."""
    lines: list[str] = []
    cur = ""
    for ch in text:
        trial = cur + ch
        if draw.textlength(trial, font=fnt) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = ch
            if len(lines) == max_lines:
                break
    if len(lines) < max_lines and cur:
        lines.append(cur)
    consumed = sum(len(l) for l in lines)
    if consumed < len(text) and lines:
        last = lines[-1]
        while last and draw.textlength(last + "~", font=fnt) > max_w:
            last = last[:-1]
        lines[-1] = last + "~"
    return lines
