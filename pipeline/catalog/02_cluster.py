"""Step 2: pairwise colour-invariant similarity + average-linkage clustering.

similarity(i, j) = W_SIL * IoU(silhouettes) + W_EDGE * cos(blurred internal edges)
                   + W_OUT * cos(blurred outlines), each maximised over small shifts.

Outputs (build/catalog_review/): sim.npz, clusters_auto.json and contact sheets
  auto_clusters_NN.png  (multi-member candidate clusters)
  auto_singletons_NN.png (singletons with their 4 nearest neighbours + scores)
The sheets are for visual verification; decisions are recorded by hand in
glyph_defs.py.
"""
from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import (BUILD_DIR, SEED_PATH, brand_of, checkerboard, font, read_json,  # noqa: E402
                    short_label, thumb_path, write_json)

W_SIL, W_EDGE, W_OUT = 0.35, 0.45, 0.20
SHIFTS = [(dx, dy) for dx in (-3, 0, 3) for dy in (-3, 0, 3)]
THRESH = 0.70


def blur_stack(x: np.ndarray, sigma: float) -> np.ndarray:
    out = np.empty(x.shape, np.float32)
    for i in range(len(x)):
        out[i] = cv2.GaussianBlur(x[i].astype(np.float32), (0, 0), sigma)
    return out


def shift_stack(x: np.ndarray, dx: int, dy: int) -> np.ndarray:
    return np.roll(np.roll(x, dy, axis=1), dx, axis=2)


def cos_max(x: np.ndarray) -> np.ndarray:
    n = len(x)
    flat = x.reshape(n, -1)
    norms = np.linalg.norm(flat, axis=1) + 1e-6
    best = np.full((n, n), -1.0, np.float32)
    for dx, dy in SHIFTS:
        g = flat @ shift_stack(x, dx, dy).reshape(n, -1).T
        best = np.maximum(best, g / norms[:, None] / norms[None, :])
    return np.maximum(best, best.T)


def iou_max(x: np.ndarray) -> np.ndarray:
    n = len(x)
    b = (x > 0.5).astype(np.float32)
    flat = b.reshape(n, -1)
    area = flat.sum(1)
    best = np.zeros((n, n), np.float32)
    for dx, dy in SHIFTS:
        inter = flat @ shift_stack(b, dx, dy).reshape(n, -1).T
        best = np.maximum(best, inter / (area[:, None] + area[None, :] - inter + 1e-6))
    return np.maximum(best, best.T)


def compute_sim(force: bool = False):
    cache = BUILD_DIR / "sim.npz"
    if cache.exists() and not force:
        z = np.load(cache, allow_pickle=False)
        return [str(f) for f in z["files"]], z["sil"], z["edge"], z["out"]
    z = np.load(BUILD_DIR / "features.npz", allow_pickle=False)
    files = [str(f) for f in z["files"]]
    sil = z["sil"].astype(np.float32)
    edge = blur_stack(z["edge"], 1.6)
    outl = blur_stack(z["outline"], 1.6)
    s_sil = iou_max(sil)
    s_edge = cos_max(edge)
    s_out = cos_max(outl)
    np.savez_compressed(cache, files=np.array(files), sil=s_sil, edge=s_edge, out=s_out)
    return files, s_sil, s_edge, s_out


def combine(s_sil, s_edge, s_out):
    s = W_SIL * s_sil + W_EDGE * s_edge + W_OUT * s_out
    np.fill_diagonal(s, 1.0)
    return s


def average_linkage(sim: np.ndarray, thresh: float) -> list[list[int]]:
    n = len(sim)
    clusters = {i: [i] for i in range(n)}
    # cluster-level similarity sums
    S = sim.astype(np.float64).copy()
    sizes = {i: 1 for i in range(n)}
    active = np.ones(n, bool)
    avg = S.copy()
    np.fill_diagonal(avg, -np.inf)
    while True:
        a_idx = np.nonzero(active)[0]
        sub = avg[np.ix_(a_idx, a_idx)]
        k = np.argmax(sub)
        i, j = divmod(k, len(a_idx))
        if sub[i, j] < thresh:
            break
        ci, cj = a_idx[i], a_idx[j]
        # merge cj into ci
        S[ci, :] += S[cj, :]
        S[:, ci] += S[:, cj]
        sizes[ci] += sizes[cj]
        clusters[ci] += clusters.pop(cj)
        active[cj] = False
        avg[cj, :] = -np.inf
        avg[:, cj] = -np.inf
        for o in np.nonzero(active)[0]:
            if o == ci:
                continue
            v = S[ci, o] / (sizes[ci] * sizes[o])
            avg[ci, o] = avg[o, ci] = v
        avg[ci, ci] = -np.inf
    return [sorted(c) for c in clusters.values()]


def calibrate(files, sim, s_sil, s_edge, s_out):
    seed = read_json(SEED_PATH)["glyphs"]
    pos = {f: i for i, f in enumerate(files)}
    label = {}
    for g, insts in seed.items():
        for it in insts:
            label[pos[it["file"]]] = g
    idx = sorted(label)
    within, between = [], []
    for a in range(len(idx)):
        for b in range(a + 1, len(idx)):
            i, j = idx[a], idx[b]
            (within if label[i] == label[j] else between).append((sim[i, j], i, j))
    within.sort()
    between.sort(reverse=True)
    print("seed within  : n=%d min=%.3f p05=%.3f median=%.3f" % (
        len(within), within[0][0], np.percentile([w[0] for w in within], 5), np.median([w[0] for w in within])))
    print("seed between : n=%d max=%.3f p99=%.3f" % (
        len(between), between[0][0], np.percentile([b[0] for b in between], 99)))
    print("weakest within-seed pairs:")
    for s, i, j in within[:12]:
        print("   %.3f sil=%.2f edge=%.2f out=%.2f  %s | %s  (%s)" % (
            s, s_sil[i, j], s_edge[i, j], s_out[i, j], files[i], files[j], label[i]))
    print("strongest between-seed pairs:")
    for s, i, j in between[:12]:
        print("   %.3f sil=%.2f edge=%.2f out=%.2f  %s (%s) | %s (%s)" % (
            s, s_sil[i, j], s_edge[i, j], s_out[i, j], files[i], label[i], files[j], label[j]))


# ---------------------------------------------------------------- sheets
TW = 118           # thumb cell width
TH = 118           # thumb image area
LAB = 30           # label area height
PAD = 6


def cell(idx: int, files: list[str], note: str | None = None) -> Image.Image:
    im = checkerboard(TW, TH + LAB, cell=8)
    th = Image.open(thumb_path(idx)).convert("RGBA")
    th.thumbnail((TW - 8, TH - 8), Image.LANCZOS)
    im.paste(th, ((TW - th.width) // 2, (TH - th.height) // 2 + 2), th)
    d = ImageDraw.Draw(im)
    d.rectangle([0, TH, TW, TH + LAB], fill=(255, 255, 255))
    f = font(10)
    lab = short_label(files[idx], 60)
    lines = []
    cur = ""
    for ch in lab:
        if d.textlength(cur + ch, font=f) > TW - 4:
            lines.append(cur)
            cur = ch
        else:
            cur += ch
    lines.append(cur)
    for k, ln in enumerate(lines[:2]):
        d.text((2, TH + 2 + k * 12), ln, fill=(0, 0, 0), font=f)
    d.rectangle([0, 0, 30, 14], fill=(0, 0, 0))
    d.text((2, 1), str(idx), fill=(255, 255, 0), font=font(11, True))
    if note:
        w = d.textlength(note, font=font(11, True))
        d.rectangle([TW - w - 4, 0, TW, 14], fill=(200, 0, 0))
        d.text((TW - w - 2, 1), note, fill=(255, 255, 255), font=font(11, True))
    d.rectangle([0, 0, TW - 1, TH + LAB - 1], outline=(160, 160, 160))
    return im


def render_rows(rows: list[tuple[str, list[tuple[int, str | None]]]], files, out_prefix: str,
                per_row: int = 12, max_h: int = 1500) -> list[Path]:
    """rows: list of (header, [(idx, note), ...]). Each row wraps at per_row cells."""
    width = PAD + per_row * (TW + PAD)
    blocks = []
    for header, items in rows:
        n_lines = max(1, (len(items) + per_row - 1) // per_row)
        h = 18 + n_lines * (TH + LAB + PAD)
        blk = Image.new("RGB", (width, h), (250, 250, 250))
        d = ImageDraw.Draw(blk)
        d.rectangle([0, 0, width, 16], fill=(40, 60, 110))
        d.text((PAD, 1), header, fill=(255, 255, 255), font=font(12, True))
        for k, (idx, note) in enumerate(items):
            r, c = divmod(k, per_row)
            blk.paste(cell(idx, files, note), (PAD + c * (TW + PAD), 18 + r * (TH + LAB + PAD)))
        blocks.append(blk)
    pages, cur, cur_h = [], [], 0
    for b in blocks:
        if cur and cur_h + b.height > max_h:
            pages.append(cur)
            cur, cur_h = [], 0
        cur.append(b)
        cur_h += b.height
    if cur:
        pages.append(cur)
    out = []
    for p_i, blks in enumerate(pages):
        H = sum(b.height for b in blks)
        page = Image.new("RGB", (width, H), (255, 255, 255))
        y = 0
        for b in blks:
            page.paste(b, (0, y))
            y += b.height
        path = BUILD_DIR / f"{out_prefix}_{p_i:02d}.png"
        page.save(path)
        out.append(path)
    return out


def main():
    force = "--force" in sys.argv
    files, s_sil, s_edge, s_out = compute_sim(force)
    sim = combine(s_sil, s_edge, s_out)
    calibrate(files, sim, s_sil, s_edge, s_out)
    clusters = average_linkage(sim, THRESH)
    clusters.sort(key=lambda c: (-len({brand_of(files[i]) for i in c}), -len(c), files[c[0]]))
    multi = [c for c in clusters if len(c) > 1]
    single = [c[0] for c in clusters if len(c) == 1]
    print(f"clusters: {len(clusters)}  multi: {len(multi)}  singletons: {len(single)}")
    write_json(BUILD_DIR / "clusters_auto.json",
               [{"k": k, "members": [files[i] for i in c], "idx": c} for k, c in enumerate(clusters)])
    for old in BUILD_DIR.glob("auto_*.png"):
        old.unlink()
    rows = []
    for k, c in enumerate(multi):
        sub = sim[np.ix_(c, c)]
        mn = sub[~np.eye(len(c), dtype=bool)].min()
        brands = sorted({brand_of(files[i]) for i in c})
        rows.append((f"C{k}  n={len(c)}  brands={len(brands)}  min_sim={mn:.2f}", [(i, None) for i in c]))
    pages = render_rows(rows, files, "auto_clusters")
    print("cluster sheets:", len(pages))
    rows = []
    for i in single:
        order = np.argsort(-sim[i])
        nn = [j for j in order if j != i][:5]
        rows.append((f"singleton {i}: {files[i]}", [(i, None)] + [(j, f"{sim[i, j]:.2f}") for j in nn]))
    # pack two singleton rows side by side (6 cells each)
    packed = []
    for a in range(0, len(rows), 2):
        pair = rows[a:a + 2]
        header = "   ||   ".join(h for h, _ in pair)
        items = []
        for h, it in pair:
            items += it
        packed.append((header[:220], items))
    pages = render_rows(packed, files, "auto_singletons")
    print("singleton sheets:", len(pages))
    with open(BUILD_DIR / "index.txt", "w", encoding="utf-8") as f:
        for i, fn in enumerate(files):
            f.write(f"{i}\t{fn}\n")


if __name__ == "__main__":
    main()
