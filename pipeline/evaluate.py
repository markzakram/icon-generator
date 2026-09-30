"""Leave-one-out over EVERY (glyph, brand) pair of the 16 standard glyphs, with caching.

For each pair: re-segment the glyph without that brand, predict the brand's colors, and compare
with the real icon (area-weighted share of regions whose color is right, dE < 10).

Usage: python pipeline/evaluate.py            # builds the cache (slow once), then sweeps settings
"""
import itertools
import os
import pickle

import numpy as np

import predict as P
import segment
from common import BRANDS, delta_e, hex_to_rgb, path, rgb_to_lab, save_json

CACHE = path("build", "loo_cache.pkl")


def build_cache():
    if os.path.exists(CACHE):
        with open(CACHE, "rb") as f:
            return pickle.load(f)
    seed = segment.seed_instances()
    base = {g: P.load_model(g) for g in P.GLYPHS}
    cache = {}
    for g in P.GLYPHS:
        for T, t_file in seed[g]:
            if len(seed[g]) < 4:
                continue
            model, region, aligned, _ = segment.build_glyph(g, seed[g], exclude=T)
            inst = [b for b, _ in seed[g] if b != T]
            ref = aligned[inst.index(model["ref_brand"])]
            t_img, _, t_iou = segment.align(ref, segment.normalized(t_file))
            actual = P.actual_region_colors(t_img, region.astype(np.int32), len(model["regions"]))
            cache[(g, T)] = {"model": model, "actual": actual, "iou": t_iou}
            print(f"cached {g:14s} {T}")
    with open(CACHE, "wb") as f:
        pickle.dump({"cache": cache, "base": {g: m[0] for g, m in base.items()}}, f)
    return {"cache": cache, "base": {g: m[0] for g, m in base.items()}}


def run(data, method="hybrid", alpha=0.5, power=4):
    results = []
    for (g, T), item in data["cache"].items():
        models = dict(data["base"])
        models[g] = item["model"]
        colors = P.Colors()
        rows = P.region_rows(models, colors)
        roles = P.Roles()
        P.role_sets(rows, roles)
        sim = P.role_similarity_j(rows)
        target = sorted([r for r in rows if r["glyph"] == g], key=lambda r: r["id"])
        if method == "hybrid":
            preds = P.predict_hybrid(target, rows, T, sim, roles, alpha=alpha, power=power)
        else:
            preds = P.predict_roles(target, T, sim, roles, power=power)
        areas = np.array([r["area"] for r in target])
        ok = np.array([delta_e(rgb_to_lab(hex_to_rgb(p["hex"])), rgb_to_lab(hex_to_rgb(a))) < 10
                       for p, a in zip(preds, item["actual"])])
        results.append({"glyph": g, "brand": T, "area_correct": float((areas * ok).sum() / areas.sum())})
    return results


def summarize(results):
    acc = np.array([r["area_correct"] for r in results])
    by_brand = {b: np.mean([r["area_correct"] for r in results if r["brand"] == b])
                for b in BRANDS if any(r["brand"] == b for r in results)}
    return {"mean": float(acc.mean()), "median": float(np.median(acc)), "share_ge_95": float((acc >= 0.95).mean()),
            "share_ge_90": float((acc >= 0.90).mean()), "n": len(results),
            "by_brand": {b: round(float(v), 4) for b, v in by_brand.items()}}


if __name__ == "__main__":
    data = build_cache()
    print(f"{len(data['cache'])} leave-one-out cases")
    best = None
    for method, alpha, power in [("roles", 0, 2), ("roles", 0, 4), ("roles", 0, 8)] + \
            [("hybrid", a, p) for a, p in itertools.product([0.25, 0.35, 0.5, 0.65], [4, 8])]:
        s = summarize(run(data, method, alpha, power))
        tag = f"{method:6s} alpha={alpha:.2f} power={power}"
        print(f"{tag}  mean={s['mean'] * 100:5.1f}%  median={s['median'] * 100:5.1f}%  >=95%: {s['share_ge_95'] * 100:4.0f}% of cases  >=90%: {s['share_ge_90'] * 100:4.0f}%")
        if best is None or s["mean"] > best[1]["mean"]:
            best = (tag, s, (method, alpha, power))
    print("best:", best[0])
    method, alpha, power = best[2]
    final = run(data, method, alpha, power)
    save_json("reports/fase0/loo_all_results.json", {"setting": {"method": method, "alpha": alpha, "power": power},
                                                    "summary": summarize(final), "cases": final})
    print(summarize(final))
