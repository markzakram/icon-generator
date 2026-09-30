"""Step 1: scan every source PNG and build colour-invariant signatures.

Per file:
  * crop to the alpha bounding box, pad to a square (small margin);
  * silhouette  = alpha channel resized to S x S;
  * edge map    = internal region boundaries: max over RGB channels of the Sobel
                  magnitude, computed only where the pixel and its neighbours are
                  opaque (so the outline is not counted twice), thresholded,
                  dilated;
  * a 200 px RGBA thumbnail for contact sheets.

Outputs (build/catalog_review/): features.npz, scan.json, thumbs/NNN.png
"""
from __future__ import annotations

import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from common import BUILD_DIR, list_pngs, load_rgba, thumb_path, write_json  # noqa: E402

S = 128          # signature resolution
WORK = 384       # working resolution for edge detection
ALPHA_T = 40     # alpha threshold for the bounding box / silhouette
EDGE_T = 90.0    # Sobel magnitude threshold (step of ~25 grey levels)


def square_pad(arr: np.ndarray, margin: float = 0.04) -> np.ndarray:
    h, w = arr.shape[:2]
    side = int(round(max(h, w) * (1 + 2 * margin)))
    out = np.zeros((side, side) + arr.shape[2:], arr.dtype)
    y0 = (side - h) // 2
    x0 = (side - w) // 2
    out[y0:y0 + h, x0:x0 + w] = arr
    return out


def process(args):
    idx, rel = args
    im = load_rgba(rel)
    W, H = im.size
    a = np.asarray(im, dtype=np.uint8)
    alpha = a[..., 3]
    stats = {
        "idx": idx, "file": rel, "w": W, "h": H,
        "min_alpha": int(alpha.min()),
        "frac_transparent": float((alpha < 8).mean()),
        "frac_semi": float(((alpha >= 8) & (alpha < 248)).mean()),
    }
    mask = alpha > ALPHA_T
    if not mask.any():
        mask = np.ones_like(mask)
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    stats["bbox"] = [int(x0), int(y0), int(x1), int(y1)]
    stats["bbox_aspect"] = float((x1 - x0) / max(1, (y1 - y0)))
    crop = a[y0:y1, x0:x1].astype(np.float32)
    # premultiply before resampling so transparent colour does not bleed
    rgb_p = crop[..., :3] * (crop[..., 3:4] / 255.0)
    sq = square_pad(np.concatenate([rgb_p, crop[..., 3:4]], axis=2))
    work = cv2.resize(sq, (WORK, WORK), interpolation=cv2.INTER_AREA)
    wa = work[..., 3] / 255.0
    with np.errstate(invalid="ignore", divide="ignore"):
        wrgb = np.where(wa[..., None] > 1e-3, work[..., :3] / np.maximum(wa[..., None], 1e-3), 0)
    wrgb = np.clip(wrgb, 0, 255).astype(np.float32)
    # colour gradient: max over channels of Sobel magnitude
    mag = np.zeros((WORK, WORK), np.float32)
    for c in range(3):
        gx = cv2.Sobel(wrgb[..., c], cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(wrgb[..., c], cv2.CV_32F, 0, 1, ksize=3)
        mag = np.maximum(mag, np.sqrt(gx * gx + gy * gy))
    opaque = (wa > 0.9).astype(np.uint8)
    inner = cv2.erode(opaque, np.ones((5, 5), np.uint8)) > 0
    edges = ((mag > EDGE_T) & inner).astype(np.uint8)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8))
    edge_s = cv2.resize(edges.astype(np.float32), (S, S), interpolation=cv2.INTER_AREA)
    sil_s = cv2.resize(wa.astype(np.float32), (S, S), interpolation=cv2.INTER_AREA)
    # outline map (for shape matching tolerant to fill differences)
    outline = cv2.morphologyEx((wa > 0.5).astype(np.uint8), cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    outline_s = cv2.resize(outline.astype(np.float32), (S, S), interpolation=cv2.INTER_AREA)
    stats["edge_density"] = float(edge_s.mean())
    stats["fill"] = float(sil_s.mean())
    # thumbnail (RGBA, un-premultiplied), longest side 200
    th = Image.fromarray(a[y0:y1, x0:x1], "RGBA")
    th.thumbnail((200, 200), Image.LANCZOS)
    tp = thumb_path(idx)
    tp.parent.mkdir(parents=True, exist_ok=True)
    th.save(tp)
    # tiny colour-name aid: dominant colours (for varian notes only, never for matching)
    opaque_px = a[..., :3][alpha > 200]
    if len(opaque_px):
        q = (opaque_px[:: max(1, len(opaque_px) // 20000)] // 32).astype(np.int32)
        keys = q[:, 0] * 64 + q[:, 1] * 8 + q[:, 2]
        vals, cnts = np.unique(keys, return_counts=True)
        order = np.argsort(-cnts)[:4]
        stats["dominant"] = [[int((v // 64) * 32 + 16), int(((v // 8) % 8) * 32 + 16), int((v % 8) * 32 + 16),
                              round(float(c / cnts.sum()), 3)] for v, c in zip(vals[order], cnts[order])]
    else:
        stats["dominant"] = []
    return idx, stats, sil_s.astype(np.float16), edge_s.astype(np.float16), outline_s.astype(np.float16)


def main():
    files = list_pngs()
    print(f"{len(files)} PNG files")
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    N = len(files)
    sil = np.zeros((N, S, S), np.float16)
    edge = np.zeros((N, S, S), np.float16)
    outl = np.zeros((N, S, S), np.float16)
    stats = [None] * N
    with ProcessPoolExecutor(max_workers=10) as ex:
        for idx, st, s, e, o in ex.map(process, list(enumerate(files)), chunksize=4):
            sil[idx], edge[idx], outl[idx], stats[idx] = s, e, o, st
            if idx % 50 == 0:
                print("  ", idx, st["file"])
    np.savez_compressed(BUILD_DIR / "features.npz", files=np.array(files), sil=sil, edge=edge, outline=outl)
    write_json(BUILD_DIR / "scan.json", stats)
    sizes = {}
    for st in stats:
        sizes[(st["w"], st["h"])] = sizes.get((st["w"], st["h"]), 0) + 1
    print("sizes:", sorted(sizes.items(), key=lambda kv: -kv[1])[:15])
    opaque_bg = [st["file"] for st in stats if st["frac_transparent"] < 0.01]
    print("files without transparent background:", len(opaque_bg))
    for f in opaque_bg:
        print("   ", f)


if __name__ == "__main__":
    main()
