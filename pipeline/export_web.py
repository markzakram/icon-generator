"""Export everything the web app needs into web/public/data.

- maps/<glyph>.png        region map 1024 px, RGB: R = region index (255 = empty), G = alpha
- maps/<glyph>.thumb.png  the same at 256 px
- originals/<brand>/<glyph>.png (+ .thumb.png)  official icons, normalized (existing-first)
- catalog.json            glyphs (names, synonyms, categories), brands (role colors), fixed colors
- roles.json              per glyph and brand: the role of every region (predicted + observed)

Usage: python pipeline/export_web.py
"""
import os
import sys

import cv2
import numpy as np
from PIL import Image

import predict as P
import segment
from common import BRANDS, brand_slug, delta_e, hex_to_rgb, load_json, path, rgb_to_lab, save_json

OUT = path("web", "public", "data")
MODELS = path("build", "models_all")
SIZE, THUMB = 1024, 256
PRIORITY = ["primary", "accent", "light", "primary_shade", "accent_shade", "primary_alt", "light_alt", "dark"]


def pick_instances(glyph):
    """One instance per brand; prefer the plain drawing over a 'varian'."""
    chosen = {}
    for it in glyph["instances"]:
        b = it["brand"]
        if b not in chosen or ("varian" in chosen[b] and "varian" not in it):
            chosen[b] = it
    return [(b, it["file"]) for b, it in chosen.items()]


def build_or_load(glyph_id, instances):
    j = os.path.join(MODELS, glyph_id + ".json")
    if os.path.exists(j):
        model = load_json(os.path.relpath(j, path()))
        region = np.array(Image.open(os.path.join(MODELS, glyph_id + ".regions.png"))).astype(np.int32) - 1
        alpha = np.array(Image.open(os.path.join(MODELS, glyph_id + ".alpha.png")))
        return model, region, alpha
    model, region, aligned, _ = segment.build_glyph(glyph_id, instances)
    alpha = np.median(np.stack([a[..., 3] for a in aligned]), axis=0).astype(np.uint8)
    region = region.astype(np.int32)
    # silhouette pixels with soft alpha (< 128) get the label of the nearest region
    soft = (alpha > 0) & (region < 0)
    if soft.any():
        region = segment.fill_nearest(region, region >= 0, soft)
    os.makedirs(MODELS, exist_ok=True)
    Image.fromarray((region + 1).astype(np.uint16)).save(os.path.join(MODELS, glyph_id + ".regions.png"))
    Image.fromarray(alpha).save(os.path.join(MODELS, glyph_id + ".alpha.png"))
    save_json(os.path.relpath(os.path.join(MODELS, glyph_id + ".json"), path()), model)
    return model, region, alpha


def resize_rgba(rgba, size):
    f = rgba.astype(np.float32)
    a = f[..., 3:4] / 255.0
    pre = np.concatenate([f[..., :3] * a, f[..., 3:4]], axis=2)
    out = cv2.resize(pre, (size, size), interpolation=cv2.INTER_AREA)
    al = out[..., 3:4]
    rgb = np.where(al > 0, out[..., :3] / np.maximum(al / 255.0, 1e-6), 0)
    return np.clip(np.concatenate([rgb, al], axis=2) + 0.5, 0, 255).astype(np.uint8)


def write_map(glyph_id, region, alpha):
    r = np.where(region >= 0, region, 255).astype(np.uint8)
    r[alpha == 0] = 255
    img = np.dstack([r, alpha, np.zeros_like(r)])
    os.makedirs(os.path.join(OUT, "maps"), exist_ok=True)
    Image.fromarray(img, "RGB").save(os.path.join(OUT, "maps", glyph_id + ".png"), optimize=True)
    rt = cv2.resize(r, (THUMB, THUMB), interpolation=cv2.INTER_NEAREST)
    at = cv2.resize(alpha, (THUMB, THUMB), interpolation=cv2.INTER_AREA)
    rt[at == 0] = 255
    Image.fromarray(np.dstack([rt, at, np.zeros_like(rt)]), "RGB").save(
        os.path.join(OUT, "maps", glyph_id + ".thumb.png"), optimize=True)


def write_original(glyph_id, brand, file):
    img = segment.normalized(file)
    d = os.path.join(OUT, "originals", brand_slug(brand))
    os.makedirs(d, exist_ok=True)
    Image.fromarray(img).save(os.path.join(d, glyph_id + ".png"), optimize=True)
    Image.fromarray(resize_rgba(img, THUMB)).save(os.path.join(d, glyph_id + ".thumb.png"), optimize=True)


def role_name(role):
    if role is None:
        return "primary"
    return role[6:] if role.startswith("fixed:") else role


def pred_role(p):
    """Role for a prediction; fixed colors (skin, hair...) are stored as their hex."""
    if p["how"] == "fixed" or p["role"] == "fixed":
        return p["hex"]
    return role_name(p["role"])


def observed_roles(target_rows, T, sim, roles, predicted):
    """Roles of T's own colors; a color with several roles is settled by what similar brands vote."""
    out = []
    for r, pred in zip(target_rows, predicted):
        rs = roles.roles_of(T, r["hex"][T])
        if not rs:
            out.append(pred)
            continue
        if len(rs) == 1:
            out.append(role_name(next(iter(rs))))
            continue
        votes = {}
        for b, bs in r["roles"].items():
            if b == T:
                continue
            for role in bs:
                votes[role] = votes.get(role, 0) + sim[(T, b)] ** 8 / len(bs)
        best = max(rs, key=lambda x: (votes.get(x, 0), -PRIORITY.index(x) if x in PRIORITY else -99))
        out.append(role_name(best))
    return out


def main():
    catalog = load_json("catalog/glyphs.json")
    brands_json = load_json("catalog/brands.json")
    seed = load_json("catalog/seed_standard16.json")["glyphs"]
    glyphs = [g for g in catalog["glyphs"] if g["tipe"] == "glyph"]
    only = set(sys.argv[1:])
    models, maps = {}, {}
    for i, g in enumerate(glyphs):
        inst = pick_instances(g)
        model, region, alpha = build_or_load(g["id"], inst)
        models[g["id"]] = model
        maps[g["id"]] = (region, alpha, inst)
        print(f"[{i + 1}/{len(glyphs)}] {g['id']:28s} brands={len(inst):2d} regions={len(model['regions'])}", flush=True)

    colors = P.Colors()
    rows = P.region_rows(models, colors)
    roles = P.Roles()
    P.role_sets(rows, roles)
    sim = P.role_similarity_j(rows)
    by_glyph = {}
    for r in rows:
        by_glyph.setdefault(r["glyph"], []).append(r)

    roles_out = {}
    for g in glyphs:
        gid = g["id"]
        target = sorted(by_glyph[gid], key=lambda r: r["id"])
        entry = {"regions": len(target), "predicted": {}, "observed": {}, "conf": {}}
        owners = set(target[0]["hex"])
        assert len(target) < 255, f"{gid}: too many regions for an 8-bit map"
        for T in BRANDS:
            s = brand_slug(T)
            preds = P.predict_hybrid(target, rows, T, sim, roles)
            entry["predicted"][s] = [pred_role(p) for p in preds]
            entry["conf"][s] = [round(float(p["conf"]), 2) for p in preds]
            if T in owners:
                entry["observed"][s] = observed_roles(target, T, sim, roles, entry["predicted"][s])
                if owners == {T}:   # nobody else draws this glyph: generating = its own colors
                    entry["predicted"][s] = entry["observed"][s]
        roles_out[gid] = entry
        if not only or gid in only:
            region, alpha, inst = maps[gid]
            write_map(gid, region, alpha)
            for b, f in inst:
                write_original(gid, b, f)
        print(f"roles {gid}", flush=True)

    brand_list = []
    for b in BRANDS:
        info = brands_json["brands"][b]
        full = P.Roles.complete(info["roles"])
        brand_list.append({"name": b, "slug": brand_slug(b), "roles": full,
                           "given": {k: v for k, v in info["roles"].items() if v},
                           "official": sum(1 for g in glyphs if any(it["brand"] == b for it in g["instances"]))})
    out = {
        "version": "fase1-2026-09-30",
        "size": SIZE, "thumb": THUMB,
        "roleLabels": {k: v for k, v in brands_json["peran"].items()},
        "fixed": brands_json["warna_tetap"]["hex"],
        "standard": list(seed.keys()),
        "brands": brand_list,
        "similarity": {brand_slug(a): {brand_slug(b): round(sim[(a, b)], 3) for b in BRANDS} for a in BRANDS},
        "glyphs": [{"id": g["id"], "nama": g["nama"], "kategori": g["kategori"], "alias": g["alias"],
                    "sinonim": g["sinonim"], "deskripsi": g.get("deskripsi_visual", ""),
                    "official": [brand_slug(b) for b, _ in maps[g["id"]][2]],
                    "brandCount": len(maps[g["id"]][2])} for g in glyphs],
    }
    os.makedirs(OUT, exist_ok=True)
    save_json(os.path.relpath(os.path.join(OUT, "catalog.json"), path()), out)
    save_json(os.path.relpath(os.path.join(OUT, "roles.json"), path()), roles_out)
    print("exported", len(glyphs), "glyphs to", OUT)


if __name__ == "__main__":
    main()
