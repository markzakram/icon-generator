"""Phase 0: predict a brand's colors for a glyph it does not have, render it, and evaluate.

How a color is predicted for region r of glyph G in target brand T:
  1. Every region of every glyph has a color "signature": which color each brand paints it with.
  2. Look for analogue regions r' in OTHER glyphs that T does have, whose signature matches r's
     (brands that paint r and r' the same way). Brands whose style resembles T count more.
  3. T's color at the best analogues is T's color for r.
Colors shared by almost every brand (skin, hair, the grey book spine) stay as they are.

Usage:
  python pipeline/predict.py loo      # leave-one-out test: 10 glyphs x 3 brands, report in reports/fase0
  python pipeline/predict.py demo     # icons that do not exist yet (JadiPCPM info/tips/link, JadiBeasiswa set)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from common import (BRANDS, CANVAS, delta_e, hex_to_rgb, lab_to_rgb, load_json, path, rgb_to_hex,
                    rgb_to_lab, save_json)
import segment

GLYPHS = ["materi", "tryout", "latsol", "rapor", "lapor_masalah", "pdf", "promo", "kalender", "live_class",
          "grup", "journey", "info", "tips", "link", "drilling_soal", "kertas_soal"]
TOKEN_DE = 3.0      # same brand color if closer than this
FIXED_SHARE = 0.8   # a color used by >= 80% of brands in a region is a fixed color (skin, spine...)
TOP_K = 6
FONT = "C:/Windows/Fonts/arial.ttf"


# ---------------------------------------------------------------- data

def load_model(glyph):
    model = load_json(f"build/models/{glyph}.json")
    region = np.array(Image.open(path("build", "models", f"{glyph}.regions.png"))).astype(np.int32) - 1
    alpha = np.array(Image.open(path("build", "models", f"{glyph}.alpha.png")))
    return model, region, alpha


class Colors:
    """Per-brand color vocabulary: hex -> token id (colors within TOKEN_DE share a token)."""

    def __init__(self):
        self.labs = {b: [] for b in BRANDS}

    def token(self, brand, hx):
        lab = rgb_to_lab(hex_to_rgb(hx))
        for i, other in enumerate(self.labs[brand]):
            if delta_e(lab, other) < TOKEN_DE:
                return i
        self.labs[brand].append(lab)
        return len(self.labs[brand]) - 1

    def hex(self, brand, tok):
        return rgb_to_hex(lab_to_rgb(self.labs[brand][tok]))


def region_rows(models, colors):
    """Flatten all regions: [{glyph, id, area, obs: {brand: token}, hex: {brand: hex}}]."""
    rows = []
    for g, m in models.items():
        for r in m["regions"]:
            obs = {b: colors.token(b, c["hex"]) for b, c in r["colors"].items()}
            rows.append({"glyph": g, "id": r["id"], "area": r["area"], "obs": obs,
                         "hex": {b: c["hex"] for b, c in r["colors"].items()}})
    return rows


# ---------------------------------------------------------------- style similarity

def style_similarity(rows):
    """Brands are alike if they give the same color to the same pairs of regions (Jaccard on
    'same color' pairs within each glyph, weighted by area). Independent of the actual hues."""
    by_glyph = {}
    for r in rows:
        by_glyph.setdefault(r["glyph"], []).append(r)
    num = {}
    den = {}
    for regs in by_glyph.values():
        for i in range(len(regs)):
            for j in range(i + 1, len(regs)):
                a, b = regs[i], regs[j]
                w = np.sqrt(a["area"] * b["area"])
                both = set(a["obs"]) & set(b["obs"])
                same = {br: a["obs"][br] == b["obs"][br] for br in both}
                for x in both:
                    for y in both:
                        if x >= y:
                            continue
                        if same[x] or same[y]:
                            num[(x, y)] = num.get((x, y), 0) + w * (same[x] and same[y])
                            den[(x, y)] = den.get((x, y), 0) + w
    sim = {}
    for x in BRANDS:
        for y in BRANDS:
            if x == y:
                sim[(x, y)] = 1.0
            else:
                k = (min(x, y), max(x, y))
                sim[(x, y)] = num.get(k, 0) / den[k] if den.get(k, 0) > 0 else 0.5
    return sim


# ---------------------------------------------------------------- prediction

def fixed_color(row):
    hexes = list(row["hex"].values())
    labs = [rgb_to_lab(hex_to_rgb(h)) for h in hexes]
    for i, h in enumerate(hexes):
        n = sum(delta_e(labs[i], l) < 6 for l in labs)
        if n >= FIXED_SHARE * len(hexes) and len(hexes) >= 3:
            return h
    return None


def predict(target_rows, rows, T, sim, colors):
    """Predict T's hex for each row in target_rows (regions of the glyph T lacks)."""
    known = [r for r in rows if T in r["obs"]]
    out = []
    for r in target_rows:
        fixed = fixed_color(r)
        scores = {}
        best = []
        for k in known:
            if k["glyph"] == r["glyph"]:
                continue
            shared = [b for b in r["obs"] if b in k["obs"] and b != T]
            if len(shared) < 3:
                continue
            w = np.array([sim[(T, b)] ** 2 for b in shared])
            agree = np.array([r["obs"][b] == k["obs"][b] for b in shared], dtype=float)
            s = float((w * agree).sum() / w.sum())
            best.append((s, k))
        best.sort(key=lambda t: -t[0])
        for s, k in best[:TOP_K]:
            tok = k["obs"][T]
            scores[tok] = scores.get(tok, 0) + s ** 4 * np.sqrt(min(k["area"], 0.1))
        top_sim = best[0][0] if best else 0
        if fixed is not None and top_sim < 0.95:
            out.append({"hex": fixed, "how": "fixed", "conf": 1.0})
        elif scores:
            tok = max(scores, key=scores.get)
            conf = scores[tok] / sum(scores.values())
            out.append({"hex": colors.hex(T, tok), "how": "analogue", "conf": round(float(conf * top_sim), 3)})
        else:
            out.append({"hex": fixed or "#FF00FF", "how": "none", "conf": 0.0})
    return out


class Roles:
    """Brand color tokens by role (catalog/brands.json). A color may fill several roles."""

    ORDER = ["primary", "primary_shade", "primary_alt", "accent", "accent_shade", "light", "light_alt", "dark"]

    def __init__(self, extra=None):
        data = load_json("catalog/brands.json")
        self.table = {b: dict(v["roles"]) for b, v in data["brands"].items()}
        if extra:
            self.table.update(extra)
        self.fixed = [rgb_to_lab(hex_to_rgb(h)) for h in data["warna_tetap"]["hex"]]
        self.full = {b: self.complete(r) for b, r in self.table.items()}

    @staticmethod
    def shift(hx, l_scale=1.0, l_add=0.0, c_scale=1.0):
        lab = rgb_to_lab(hex_to_rgb(hx)).astype(np.float64)
        lab[0] = np.clip(lab[0] * l_scale + l_add, 4, 99)
        lab[1:] *= c_scale
        return rgb_to_hex(lab_to_rgb(lab.astype(np.float32)))

    @classmethod
    def complete(cls, roles):
        """Fill missing roles from the ones given (used for new brands too)."""
        r = dict(roles)
        p, a = r["primary"], r.get("accent") or r["primary"]
        r["accent"] = a
        L = rgb_to_lab(hex_to_rgb(p))[0]
        r["primary_shade"] = r.get("primary_shade") or cls.shift(p, 0.5, 0, 0.9)
        r["primary_alt"] = r.get("primary_alt") or (cls.shift(p, 1, 12) if L < 40 else cls.shift(p, 1, -14))
        r["accent_shade"] = r.get("accent_shade") or cls.shift(a, 0.5, 0, 0.9)
        r["light"] = r.get("light") or "#FFFFFF"
        r["light_alt"] = r.get("light_alt") or r["light"]
        r["dark"] = r.get("dark") or "#221F1F"
        return r

    def roles_of(self, brand, hx):
        """Which roles does this brand color play? Unknown colors -> nearest role, else fixed."""
        lab = rgb_to_lab(hex_to_rgb(hx))
        given = {k: v for k, v in self.table[brand].items() if v}
        hit = {k for k, v in given.items() if delta_e(lab, rgb_to_lab(hex_to_rgb(v))) < TOKEN_DE}
        if hit:
            return hit
        if any(delta_e(lab, f) < 4 for f in self.fixed):
            return {"fixed:" + hx}
        near = min(given, key=lambda k: delta_e(lab, rgb_to_lab(hex_to_rgb(given[k]))))
        if delta_e(lab, rgb_to_lab(hex_to_rgb(given[near]))) < 20:
            return {near}
        return set()   # not a brand color and not a global fixed color: this brand abstains


def role_similarity(rows, roles):
    """Brands are alike if they give the same role to the same regions (area weighted)."""
    num, den = {}, {}
    cache = {}

    def rs(b, hx):
        if (b, hx) not in cache:
            cache[(b, hx)] = roles.roles_of(b, hx)
        return cache[(b, hx)]

    for r in rows:
        bs = list(r["hex"])
        for i, x in enumerate(bs):
            for y in bs[i + 1:]:
                k = (min(x, y), max(x, y))
                agree = bool(rs(x, r["hex"][x]) & rs(y, r["hex"][y]))
                num[k] = num.get(k, 0) + r["area"] * agree
                den[k] = den.get(k, 0) + r["area"]
    sim = {}
    for x in BRANDS:
        for y in BRANDS:
            k = (min(x, y), max(x, y))
            sim[(x, y)] = 1.0 if x == y else (num[k] / den[k] if den.get(k) else 0.5)
    return sim


def predict_roles(target_rows, T, sim, roles, power=4):
    """Weighted vote over the roles other brands give each region; paint with T's role colors."""
    out = []
    for r in target_rows:
        fixed = fixed_color(r)
        votes = {}
        for b, hx in r["hex"].items():
            if b == T:
                continue
            rs = roles.roles_of(b, hx)
            if not rs:
                continue
            w = sim[(T, b)] ** power
            for role in rs:
                votes[role] = votes.get(role, 0) + w / len(rs)
        if fixed is not None:
            out.append({"hex": fixed, "how": "fixed", "role": "fixed", "conf": 1.0})
            continue
        role = max(votes, key=votes.get)
        conf = votes[role] / sum(votes.values())
        hx = role[6:] if role.startswith("fixed:") else roles.full[T][role]
        out.append({"hex": hx, "how": "role", "role": role, "conf": round(float(conf), 3)})
    return out


def jaccard(a, b):
    return len(a & b) / len(a | b) if (a or b) else 0.0


def role_sets(rows, roles):
    cache = {}
    for r in rows:
        r["roles"] = {}
        for b, hx in r["hex"].items():
            if (b, hx) not in cache:
                cache[(b, hx)] = frozenset(roles.roles_of(b, hx))
            r["roles"][b] = cache[(b, hx)]


def role_similarity_j(rows):
    """Like role_similarity, but a color that plays several roles only half-agrees (Jaccard)."""
    num, den = {}, {}
    for r in rows:
        bs = list(r["roles"])
        for i, x in enumerate(bs):
            for y in bs[i + 1:]:
                k = (min(x, y), max(x, y))
                if not (r["roles"][x] and r["roles"][y]):
                    continue
                num[k] = num.get(k, 0) + r["area"] * jaccard(r["roles"][x], r["roles"][y])
                den[k] = den.get(k, 0) + r["area"]
    return {(x, y): 1.0 if x == y else (num[(min(x, y), max(x, y))] / den[(min(x, y), max(x, y))]
                                        if den.get((min(x, y), max(x, y))) else 0.5)
            for x in BRANDS for y in BRANDS}


def predict_hybrid(target_rows, rows, T, sim, roles, k=TOP_K, alpha=0.35, power=8):
    """Blend two signals per region: (1) the roles that brands similar to T give this region,
    (2) role analogues: regions in T's OWN glyphs whose role pattern across brands matches,
    which carry T's habits (e.g. JadiPCPM always uses white for text lines)."""
    known = [r for r in rows if T in r["roles"]]
    # a brand with only a few icons has no habits to learn yet: follow the vote (style reference)
    learn_habits = len({q["glyph"] for q in known}) >= 5
    out = []
    for r in target_rows:
        fixed = fixed_color(r)
        if fixed is not None:
            out.append({"hex": fixed, "how": "fixed", "role": "fixed", "conf": 1.0})
            continue
        vote = {}
        for b, rs in r["roles"].items():
            if b == T or not rs:
                continue
            for role in rs:
                vote[role] = vote.get(role, 0) + sim[(T, b)] ** power / len(rs)
        cands = []
        for q in known:
            if q["glyph"] == r["glyph"] or not q["roles"][T]:
                continue
            shared = [b for b in r["roles"] if b in q["roles"] and b != T and r["roles"][b] and q["roles"][b]]
            if len(shared) < 4:
                continue
            w = np.array([sim[(T, b)] ** 2 for b in shared])
            j = np.array([jaccard(r["roles"][b], q["roles"][b]) for b in shared])
            cands.append((float((w * j).sum() / w.sum()), q))
        cands.sort(key=lambda t: -t[0])
        ana = {}
        for s, q in cands[:k]:
            for role in q["roles"][T]:
                ana[role] = ana.get(role, 0) + s ** 4 * np.sqrt(min(q["area"], 0.1)) / len(q["roles"][T])
        total_v, total_a = sum(vote.values()) or 1, sum(ana.values())
        use_ana = learn_habits and bool(cands) and cands[0][0] >= 0.6 and total_a > 0
        score = {}
        for role in set(vote) | set(ana):
            v = vote.get(role, 0) / total_v
            a = ana.get(role, 0) / total_a if use_ana else 0
            score[role] = (1 - alpha) * v + alpha * a if use_ana else v
        if not score:
            out.append({"hex": "#FF00FF", "how": "none", "role": None, "conf": 0.0})
            continue
        role = max(score, key=score.get)
        hx = role[6:] if role.startswith("fixed:") else roles.full[T][role]
        out.append({"hex": hx, "how": "hybrid", "role": role, "conf": round(float(score[role]), 3)})
    return out


def render(region, alpha, hexes):
    lut = np.array([hex_to_rgb(h) for h in hexes] + [[0, 0, 0]], dtype=np.uint8)
    rgb = lut[np.where(region >= 0, region, len(hexes))]
    return np.dstack([rgb, alpha])


def context(exclude_glyph=None, exclude_brand=None, extra=None):
    """Models for all glyphs; the excluded glyph is re-segmented without the excluded brand."""
    models, maps = {}, {}
    seed = segment.seed_instances()
    for g in GLYPHS:
        if g == exclude_glyph:
            inst = [b for b, _ in seed[g] if b != exclude_brand]
            model, region, aligned, _ = segment.build_glyph(g, seed[g], exclude=exclude_brand)
            alpha = np.median(np.stack([a[..., 3] for a in aligned]), axis=0).astype(np.uint8)
            ref_img = aligned[inst.index(model["ref_brand"])]
            models[g], maps[g] = model, (region.astype(np.int32), alpha, ref_img)
        else:
            model, region, alpha = load_model(g)
            models[g], maps[g] = model, (region, alpha, None)
    colors = Colors()
    rows = region_rows(models, colors)
    roles = Roles(extra)
    role_sets(rows, roles)
    sim = role_similarity_j(rows)
    return models, maps, rows, sim, colors, roles


METHOD = "roles"


def generate(glyph, T, ctx):
    models, maps, rows, sim, colors, roles = ctx
    region, alpha, _ = maps[glyph]
    target_rows = sorted([r for r in rows if r["glyph"] == glyph], key=lambda r: r["id"])
    if METHOD == "roles":
        preds = predict_roles(target_rows, T, sim, roles)
    elif METHOD == "hybrid":
        preds = predict_hybrid(target_rows, rows, T, sim, roles)
    else:
        preds = predict(target_rows, rows, T, sim, colors)
    return render(region, alpha, [p["hex"] for p in preds]), preds, target_rows


# ---------------------------------------------------------------- leave-one-out test

TEST_GLYPHS = ["materi", "tryout", "latsol", "rapor", "lapor_masalah", "pdf", "promo", "kalender", "live_class", "kertas_soal"]
TEST_BRANDS = ["JadiPCPM", "JadiASN", "TOEFL Academy"]


def actual_region_colors(T_img, region, n):
    """T's real color per region (majority of its clean fill labels)."""
    mask = region >= 0
    cols, labs = segment.palette(T_img)
    lbl = segment.label_map(T_img, labs, mask)
    out = []
    for i in range(n):
        v, c = np.unique(lbl[region == i], return_counts=True)
        out.append(rgb_to_hex(cols[v[c.argmax()]]))
    return out


def loo():
    seed = segment.seed_instances()
    results = []
    rows_img = []
    for g in TEST_GLYPHS:
        for T in TEST_BRANDS:
            ctx = context(exclude_glyph=g, exclude_brand=T)
            models, maps, rows, sim, colors, roles = ctx
            img, preds, target_rows = generate(g, T, ctx)
            region, alpha, ref_img = maps[g]
            t_file = dict(seed[g])[T]
            t_img, _, t_iou = segment.align(ref_img, segment.normalized(t_file))
            actual = actual_region_colors(t_img, region, len(target_rows))
            areas = np.array([r["area"] for r in target_rows])
            ok = np.array([delta_e(rgb_to_lab(hex_to_rgb(p["hex"])), rgb_to_lab(hex_to_rgb(a))) < 10
                           for p, a in zip(preds, actual)])
            acc = float((areas * ok).sum() / areas.sum())
            # pixel error inside the shape where the original is solid
            solid = (t_img[..., 3] == 255) & (region >= 0)
            de = delta_e(rgb_to_lab(img[..., :3]), rgb_to_lab(t_img[..., :3]))
            px_bad = float((de[solid] > 10).mean())
            nearest = max((b for b in dict(seed[g]) if b != T), key=lambda b: sim[(T, b)])
            results.append({"glyph": g, "brand": T, "area_correct": round(acc, 4),
                            "pixels_off": round(px_bad, 4), "align_iou": round(float(t_iou), 4),
                            "regions": len(target_rows), "wrong_regions": [
                                {"id": r["id"], "area": r["area"], "pred": p["hex"], "actual": a}
                                for r, p, a, k in zip(target_rows, preds, actual, ok) if not k],
                            "nearest_style": nearest})
            src = segment.normalized(dict(seed[g])[nearest])
            err = np.zeros_like(img)
            err[..., 3] = np.where(region >= 0, 255, 0)
            err[..., :3] = 225
            err[solid & (de > 10)] = [220, 30, 30, 255]
            rows_img.append((g, T, nearest, src, img, t_img, err, acc))
            print(f"{g:14s} {T:14s} area_correct={acc * 100:5.1f}%  pixels_off={px_bad * 100:4.1f}%  style~{nearest}")
    os.makedirs(path("reports", "fase0"), exist_ok=True)
    save_json(f"reports/fase0/loo_results_{METHOD}.json", results)
    sheet(rows_img, path("reports", "fase0", f"loo_sheet_{METHOD}.png"))
    by_brand = {T: np.mean([r["area_correct"] for r in results if r["brand"] == T]) for T in TEST_BRANDS}
    print("mean area_correct by brand:", {k: round(v * 100, 1) for k, v in by_brand.items()})
    print("overall:", round(np.mean([r["area_correct"] for r in results]) * 100, 1))


def thumb(rgba, size=150):
    bg = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    im = Image.fromarray(rgba).resize((size, size), Image.LANCZOS)
    bg.alpha_composite(im)
    return bg.convert("RGB")


def sheet(rows_img, out_file):
    T = 150
    f = ImageFont.truetype(FONT, 13)
    fb = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 13)
    heads = ["Sumber (gaya terdekat)", "Hasil generate", "Icon asli", "Beda warna (merah)"]
    W = 190 + 4 * (T + 10)
    H = 36 + len(rows_img) * (T + 10)
    img = Image.new("RGB", (W, H), (248, 248, 248))
    d = ImageDraw.Draw(img)
    for j, h in enumerate(heads):
        d.text((190 + j * (T + 10) + T // 2, 18), h, font=fb, fill=(0, 0, 0), anchor="mm")
    for i, (g, Tb, near, src, gen, orig, err, acc) in enumerate(rows_img):
        y = 36 + i * (T + 10)
        d.text((10, y + 40), g, font=fb, fill=(0, 0, 0))
        d.text((10, y + 60), Tb, font=f, fill=(0, 0, 0))
        d.text((10, y + 80), f"benar {acc * 100:.1f}% area", font=f, fill=(0, 110, 0) if acc >= 0.95 else (190, 0, 0))
        d.text((10, y + 100), f"gaya ~ {near}", font=ImageFont.truetype(FONT, 11), fill=(90, 90, 90))
        for j, im in enumerate([src, gen, orig, err]):
            img.paste(thumb(im, T), (190 + j * (T + 10), y))
    img.save(out_file)


if __name__ == "__main__":
    if len(sys.argv) > 2:
        METHOD = sys.argv[2]
    {"loo": loo}[sys.argv[1]]()
