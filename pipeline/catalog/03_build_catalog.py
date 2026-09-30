"""Step 3: build catalog/glyphs.json from assignments.json (membership, decided by
visual review) + glyph_meta.py (names, categories, synonyms).

Also writes build/catalog_review/glyph_stats.json with similarity diagnostics:
  * min / mean pairwise similarity inside each glyph;
  * per instance: the glyph whose members it resembles most (a second opinion
    on the manual grouping; disagreements are listed for review).
"""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (BRANDS, BUILD_DIR, GLYPHS_PATH, abs_path, brand_of, list_pngs,  # noqa: E402
                    read_json, thumb_path, write_json)
from glyph_meta import KATEGORI, META  # noqa: E402

DUP_MAX_DIFF = 1.0   # mean |diff| (0-255) of 96px premultiplied RGBA thumbnails; next pair up is ~2.8

ASSIGN_PATH = Path(__file__).resolve().parent / "assignments.json"
VERSION = 1
DIBUAT = "2026-09-30"

# ------------------------------------------------------------------ alias
_DROP = {"icon", "menu", "logo", "revisi", "untitled", "artboard", "png", "biru", "kuning"}
_BRAND_PHRASES = ["jadi asn", "jadi pcpm", "jago tpa"]


def alias_phrases(rel: str) -> list[str]:
    """Meaningful words/phrases from a filename (lowercased)."""
    stem = rel.rsplit("/", 1)[-1]
    stem = re.sub(r"\.png$", "", stem, flags=re.I)
    s = stem.lower()
    s = re.sub(r"\d+\s*&\s*\d+", " ", s)          # "1&2"
    s = re.sub(r"\(\d+\)", " ", s)                # "(1)" copy suffix
    s = re.sub(r"@\d+x", " ", s)                  # "@4x"
    s = re.sub(r"[()\[\]]", " ", s)
    s = re.sub(r"[_\-=]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    for b in _BRAND_PHRASES:
        s = re.sub(rf"\b{b}\b", " ", s)
    out = []
    # split only on '&' and ','; "x dan y" is usually one concept (bimbingan dan konseling)
    for part in re.split(r"\s*&\s*|\s*,\s*", s):
        part = re.sub(r"^(dan|atau)\s+", "", part.strip())
        toks = []
        for t in part.split():
            if t in _DROP or re.fullmatch(r"icon\d*", t) or re.fullmatch(r"e\d{6,}", t):
                continue
            if re.fullmatch(r"(19|20)\d\d", t):       # years
                continue
            t = re.sub(r"(?<=[a-z])\d$", "", t)       # jasmani2 -> jasmani
            toks.append(t)
        if toks and toks[0] == "studi":               # PPG "Icon_Studi <bidang studi>"
            toks = toks[1:]
        if len(toks) > 1 and toks[0] in ("saintek", "soshum"):   # "Saintek_Biologi"
            out.append(toks[0])
            toks = toks[1:]
        if not any(re.search(r"[a-z]", t) for t in toks):
            continue
        ph = " ".join(toks).strip(" .")
        if len(ph) >= 2:
            out.append(ph)
    return out


def dedupe(seq):
    seen, out = set(), []
    for x in seq:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


# ------------------------------------------------------------- diagnostics
def similarity_matrix(files: list[str]):
    p = BUILD_DIR / "sim.npz"
    if not p.exists():
        return None
    z = np.load(p, allow_pickle=False)
    if [str(f) for f in z["files"]] != files:
        return None
    s = 0.35 * z["sil"] + 0.45 * z["edge"] + 0.20 * z["out"]
    np.fill_diagonal(s, 1.0)
    return s


def diagnostics(glyphs: list[dict], files: list[str]) -> dict:
    sim = similarity_matrix(files)
    if sim is None:
        return {}
    pos = {f: i for i, f in enumerate(files)}
    members = {gl["id"]: [pos[it["file"]] for it in gl["instances"]] for gl in glyphs}
    stats = {"glyph": {}, "instance_disagreements": [], "singleton_nearest": []}
    for gid, idx in members.items():
        if len(idx) > 1:
            sub = sim[np.ix_(idx, idx)]
            off = sub[~np.eye(len(idx), dtype=bool)]
            stats["glyph"][gid] = {"n": len(idx), "min_sim": round(float(off.min()), 3),
                                   "mean_sim": round(float(off.mean()), 3)}
        else:
            stats["glyph"][gid] = {"n": 1}
    gids = list(members)
    for gid, idx in members.items():
        for i in idx:
            best_g, best_v, own_v = None, -1.0, None
            for og in gids:
                others = [j for j in members[og] if j != i]
                if not others:
                    continue
                v = float(sim[i, others].max())      # nearest member of that glyph
                if og == gid:
                    own_v = v
                if v > best_v:
                    best_g, best_v = og, v
            if own_v is None:
                # singleton glyph: remember its closest neighbour glyph (kept separate on purpose)
                stats["singleton_nearest"].append({"file": files[i], "glyph": gid,
                                                   "glyph_terdekat": best_g, "sim_terdekat": round(best_v, 3)})
                continue
            if best_g != gid and best_v - own_v > 0.02:
                stats["instance_disagreements"].append({
                    "file": files[i], "glyph": gid,
                    "sim_ke_glyph_sendiri": None if own_v is None else round(own_v, 3),
                    "glyph_terdekat": best_g, "sim_terdekat": round(best_v, 3)})
    return stats


def _thumb_sig(i: int) -> np.ndarray:
    im = Image.open(thumb_path(i)).convert("RGBA")
    w, h = im.size
    s = max(w, h)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - w) // 2, (s - h) // 2))
    a = np.asarray(canvas.resize((96, 96), Image.LANCZOS), dtype=np.float32)
    a[..., :3] *= a[..., 3:4] / 255.0
    return a


def duplicate_groups(glyphs: list[dict], files: list[str]) -> list[dict]:
    """Instances of the same glyph that are byte-identical or pixel-identical (same drawing AND
    same colours). Uses the step-1 thumbnails; returns [] when they are missing."""
    pos = {f: i for i, f in enumerate(files)}
    if not all(thumb_path(i).exists() for i in range(len(files))):
        return []
    md5 = {f: hashlib.md5(abs_path(f).read_bytes()).hexdigest() for f in files}
    out = []
    for gl in glyphs:
        fs = [it["file"] for it in gl["instances"]]
        if len(fs) < 2:
            continue
        sigs = {f: _thumb_sig(pos[f]) for f in fs}
        parent = {f: f for f in fs}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x
        for a in range(len(fs)):
            for b in range(a + 1, len(fs)):
                fa, fb = fs[a], fs[b]
                if md5[fa] == md5[fb] or float(np.abs(sigs[fa] - sigs[fb]).mean()) < DUP_MAX_DIFF:
                    parent[find(fa)] = find(fb)
        groups: dict[str, list[str]] = {}
        for f in fs:
            groups.setdefault(find(f), []).append(f)
        for members in groups.values():
            if len(members) > 1:
                out.append({"glyph": gl["id"], "files": sorted(members),
                            "identik_byte": len({md5[m] for m in members}) == 1})
    return out


# -------------------------------------------------------------------- main
def main():
    files = list_pngs()
    assign = read_json(ASSIGN_PATH)["glyphs"]
    brand_rank = {b: k for k, b in enumerate(BRANDS)}
    missing_meta = [g for g in assign if g not in META]
    unused_meta = [g for g in META if g not in assign]
    if missing_meta or unused_meta:
        raise SystemExit(f"metadata mismatch: missing={missing_meta} unused={unused_meta}")
    seen: dict[str, str] = {}
    glyphs = []
    for gid, items in assign.items():
        m = META[gid]
        assert m["kategori"] in KATEGORI, (gid, m["kategori"])
        insts = []
        for it in items:
            f = it["file"]
            if not abs_path(f).is_file():
                raise SystemExit(f"{gid}: file not found: {f!r}")
            if f in seen:
                raise SystemExit(f"{f!r} assigned twice ({seen[f]}, {gid})")
            seen[f] = gid
            inst = {"brand": brand_of(f), "file": f}
            if it.get("varian"):
                inst["varian"] = it["varian"]
            insts.append(inst)
        insts.sort(key=lambda x: (brand_rank[x["brand"]], x["file"].lower()))
        brands = dedupe([x["brand"] for x in insts])
        alias = dedupe([a for x in insts for a in alias_phrases(x["file"])])
        glyphs.append({
            "id": gid,
            "nama": m["nama"],
            "kategori": m["kategori"],
            "tipe": m["tipe"],
            "alias": alias,
            "sinonim": m["sinonim"],
            "deskripsi_visual": m["deskripsi_visual"],
            "brands": brands,
            "instances": insts,
        })
    glyphs.sort(key=lambda gl: (-len(gl["brands"]), gl["id"]))
    unassigned = [f for f in files if f not in seen]
    catalog = {"version": VERSION, "dibuat": DIBUAT, "glyphs": glyphs, "unassigned": unassigned}
    write_json(GLYPHS_PATH, catalog)
    print(f"wrote {GLYPHS_PATH}  glyphs={len(glyphs)}  files={len(seen)}  unassigned={len(unassigned)}")

    stats = diagnostics(glyphs, files)
    if stats:
        write_json(BUILD_DIR / "glyph_stats.json", stats)
        dis = stats["instance_disagreements"]
        print(f"similarity cross-check: {len(dis)} instance(s) look closer to another glyph")
        for d in dis:
            print("   ", d)
        low = sorted(((v["min_sim"], k) for k, v in stats["glyph"].items() if "min_sim" in v))[:12]
        print("lowest intra-glyph min similarity:", low)
        stats["singleton_nearest"].sort(key=lambda d: -d["sim_terdekat"])
        stats["duplikat"] = duplicate_groups(glyphs, files)
        n_dup_files = sum(len(d["files"]) for d in stats["duplikat"])
        print(f"duplicate groups (same drawing AND same colours): {len(stats['duplikat'])} "
              f"covering {n_dup_files} files")
        write_json(BUILD_DIR / "glyph_stats.json", stats)
        print("singletons closest to another glyph (kept separate after visual check):")
        for d in stats["singleton_nearest"][:12]:
            print("   ", d)


if __name__ == "__main__":
    main()
