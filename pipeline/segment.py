"""Phase 0: normalize every instance of a glyph, align them, and co-segment into color regions.

A region is a set of pixels that every brand paints with one single color. Comparing brands tells
regions apart even when one brand happens to use the same color for both (e.g. JadiASN paints text
lines and back papers yellow, JadiPCPM paints them white and magenta).

Usage: python pipeline/segment.py [glyph ...]      (default: all glyphs in catalog/seed_standard16.json)
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

from common import (CANVAS, ROOT, delta_e, exact_colors, load_json, load_rgba, normalize, path,
                    rgb_to_hex, rgb_to_lab, save_json, warp)

PALETTE_MIN_SHARE = 0.0025   # a color must cover 0.25% of opaque pixels to count as a flat fill
MERGE_DE = 3.0               # colors closer than this are the same fill
CLEAN_DE = 4.0               # pixel is "clean" (not anti-aliased) if this close to a fill color
MIN_REGION = 0.0004          # regions smaller than 0.04% of the glyph are slivers


def seed_instances():
    seed = load_json("catalog/seed_standard16.json")["glyphs"]
    return {g: [(it["brand"], it["file"]) for it in items] for g, items in seed.items()}


def normalized(file, size=CANVAS):
    cache = path("build", "norm", str(size), file.replace("/", "__"))
    if os.path.exists(cache):
        return np.array(Image.open(cache).convert("RGBA"))
    out, _ = normalize(load_rgba(file), size)
    os.makedirs(os.path.dirname(cache), exist_ok=True)
    Image.fromarray(out).save(cache)
    return out


def iou(a, b):
    a, b = a > 127, b > 127
    return (a & b).sum() / max((a | b).sum(), 1)


def align(ref, img):
    """Affine-align img onto ref using ECC on blurred alpha. Returns (aligned, iou_before, iou_after)."""
    before = iou(ref[..., 3], img[..., 3])
    if before > 0.985:
        return img, before, before
    n = CANVAS // 2
    t = cv2.GaussianBlur(cv2.resize(ref[..., 3], (n, n)).astype(np.float32) / 255, (0, 0), 2)
    s = cv2.GaussianBlur(cv2.resize(img[..., 3], (n, n)).astype(np.float32) / 255, (0, 0), 2)
    w = np.eye(2, 3, dtype=np.float32)
    try:
        _, w = cv2.findTransformECC(t, s, w, cv2.MOTION_AFFINE,
                                    (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-7), None, 5)
    except cv2.error:
        return img, before, before
    w[:, 2] *= CANVAS / n
    inv = cv2.invertAffineTransform(w)
    out = warp(img, inv.astype(np.float32), CANVAS, interp=cv2.INTER_LINEAR)
    after = iou(ref[..., 3], out[..., 3])
    return (out, before, after) if after > before else (img, before, before)


def palette(rgba):
    cols, cnt = exact_colors(rgba, PALETTE_MIN_SHARE)
    labs = rgb_to_lab(cols)
    keep = []
    for i in range(len(cols)):
        if all(delta_e(labs[i], labs[j]) >= MERGE_DE for j in keep):
            keep.append(i)
    return cols[keep], labs[keep]


def fill_nearest(labels, known, where):
    """Give every pixel in `where` the label of the nearest pixel in `known`."""
    src = np.where(known, 0, 1).astype(np.uint8)
    _, lbl = cv2.distanceTransformWithLabels(src, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    lut = np.zeros(lbl.max() + 1, dtype=labels.dtype)
    lut[lbl[known]] = labels[known]
    out = labels.copy()
    out[where] = lut[lbl[where]]
    return out


def label_map(rgba, pal_lab, mask):
    """Nearest fill color per pixel; anti-aliased pixels take the label of the nearest clean pixel."""
    lab = rgb_to_lab(rgba[..., :3])
    d = np.stack([delta_e(lab, c) for c in pal_lab])
    idx = d.argmin(0).astype(np.int16)
    clean = (rgba[..., 3] == 255) & (d.min(0) < CLEAN_DE)
    return fill_nearest(idx, clean, mask)


def cosegment(images, brands):
    """images: aligned RGBA arrays. Returns (region map int16 with -1 outside, regions list)."""
    alphas = np.stack([im[..., 3] for im in images])
    mask = np.median(alphas, axis=0) >= 128
    total = int(mask.sum())
    pals, maps = [], []
    for im in images:
        cols, labs = palette(im)
        pals.append(cols)
        maps.append(label_map(im, labs, mask))
    base = max(len(p) for p in pals) + 1
    code = np.zeros(mask.shape, dtype=np.int64)
    for m in maps:
        code = code * base + m.astype(np.int64)
    codes, inv, counts = np.unique(code[mask], return_inverse=True, return_counts=True)
    cls = np.full(mask.shape, -1, dtype=np.int32)
    cls[mask] = inv
    kernel = np.ones((3, 3), np.uint8)
    valid = np.zeros(len(codes), dtype=bool)
    for c in np.nonzero(counts >= MIN_REGION * total)[0]:
        core = cv2.erode((cls == c).astype(np.uint8), kernel, iterations=2).sum()
        valid[c] = core >= 0.2 * counts[c]
    good = mask & valid[np.maximum(cls, 0)]
    cls = fill_nearest(cls, good, mask & ~good)
    keep = np.unique(cls[mask])
    remap = np.full(len(codes), -1, dtype=np.int32)
    remap[keep] = np.arange(len(keep))
    region = np.full(mask.shape, -1, dtype=np.int16)
    region[mask] = remap[cls[mask]]
    regions = []
    for new, old in enumerate(keep):
        sel = region == new
        colors = {}
        for i, b in enumerate(brands):
            lab_i = maps[i][sel]
            vals, cnt = np.unique(lab_i, return_counts=True)
            k = vals[cnt.argmax()]
            colors[b] = {"hex": rgb_to_hex(pals[i][k]), "share": round(float(cnt.max() / cnt.sum()), 3)}
        ys, xs = np.nonzero(sel)
        regions.append({"id": new, "area": round(float(sel.sum() / total), 5),
                        "cx": int(xs.mean()), "cy": int(ys.mean()), "colors": colors})
    return region, regions, mask


def build_glyph(glyph, instances, exclude=None):
    """Normalize + align + co-segment one glyph. `exclude` = brand left out (leave-one-out)."""
    inst = [(b, f) for b, f in instances if b != exclude]
    imgs = [normalized(f) for _, f in inst]
    # reference = instance that overlaps the others best
    small = [cv2.resize(im[..., 3], (256, 256)) for im in imgs]
    score = [np.mean([iou(a, b) for b in small]) for a in small]
    ref = int(np.argmax(score))
    aligned, quality = [], {}
    for (b, _), im in zip(inst, imgs):
        out, before, after = align(imgs[ref], im)
        aligned.append(out)
        quality[b] = round(float(after), 4)
    region, regions, mask = cosegment(aligned, [b for b, _ in inst])
    return {"glyph": glyph, "ref_brand": inst[ref][0], "alignment_iou": quality,
            "regions": regions}, region, aligned, mask


def save_model(model, region, aligned, tag=""):
    name = model["glyph"] + tag
    out_dir = path("build", "models")
    os.makedirs(out_dir, exist_ok=True)
    Image.fromarray((region.astype(np.int32) + 1).astype(np.uint16)).save(os.path.join(out_dir, name + ".regions.png"))
    alpha = np.median(np.stack([a[..., 3] for a in aligned]), axis=0).astype(np.uint8)
    Image.fromarray(alpha).save(os.path.join(out_dir, name + ".alpha.png"))
    save_json(f"build/models/{name}.json", model)


def preview(region, out_file):
    rng = np.random.default_rng(7)
    lut = rng.integers(40, 255, size=(region.max() + 2, 3), dtype=np.uint8)
    lut[0] = 255
    img = lut[region.astype(np.int32) + 1]
    Image.fromarray(img).resize((512, 512), Image.NEAREST).save(out_file)


if __name__ == "__main__":
    seed = seed_instances()
    targets = sys.argv[1:] or list(seed)
    os.makedirs(path("build", "previews"), exist_ok=True)
    for g in targets:
        model, region, aligned, mask = build_glyph(g, seed[g])
        save_model(model, region, aligned)
        preview(region, path("build", "previews", f"{g}.regions.png"))
        low = {b: v for b, v in model["alignment_iou"].items() if v < 0.97}
        print(f"{g:14s} brands={len(seed[g]):2d} regions={len(model['regions']):3d} ref={model['ref_brand']:13s} low-align={low}")
