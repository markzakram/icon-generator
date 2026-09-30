"""Shared helpers for the Phase 0 pipeline: loading icons, color math, normalization."""
import json
import os

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDS = [
    "JadiASN", "JadiBUMN", "JadiPrajurit", "JadiPPG", "Cerebrum", "JadiOJK", "JadiSekdin",
    "JadiPPPK", "JadiPCPM", "Jago TPA", "TOEFL Academy", "JadiPolisi", "JadiBeasiswa", "Psikotes kerja",
]


def brand_slug(brand):
    return brand.lower().replace(" ", "_")


def path(*parts):
    return os.path.join(ROOT, *parts)


def load_json(rel):
    with open(path(rel), encoding="utf-8") as f:
        return json.load(f)


def save_json(rel, data):
    os.makedirs(os.path.dirname(path(rel)), exist_ok=True)
    with open(path(rel), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)


def load_rgba(rel):
    return np.array(Image.open(path(rel)).convert("RGBA"))


def hex_to_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.uint8)


def rgb_to_hex(rgb):
    return "#%02X%02X%02X" % tuple(int(v) for v in rgb)


def rgb_to_lab(rgb):
    """rgb: (..., 3) uint8 -> (..., 3) float32 CIELAB (L 0-100)."""
    arr = np.asarray(rgb, dtype=np.float32).reshape(-1, 1, 3) / 255.0
    lab = cv2.cvtColor(arr, cv2.COLOR_RGB2Lab)
    return lab.reshape(np.asarray(rgb).shape[:-1] + (3,))


def lab_to_rgb(lab):
    arr = np.asarray(lab, dtype=np.float32).reshape(-1, 1, 3)
    rgb = cv2.cvtColor(arr, cv2.COLOR_Lab2RGB)
    return np.clip(np.round(rgb.reshape(np.asarray(lab).shape[:-1] + (3,)) * 255), 0, 255).astype(np.uint8)


def delta_e(lab1, lab2):
    """CIE76 distance; good enough to tell flat brand colors apart."""
    return np.linalg.norm(np.asarray(lab1, np.float32) - np.asarray(lab2, np.float32), axis=-1)


def exact_colors(rgba, min_share=0.0):
    """Exact RGB histogram of fully opaque pixels -> (colors uint8 Nx3, counts), sorted by count."""
    op = rgba[..., 3] == 255
    rgb = rgba[..., :3][op].reshape(-1, 3)
    key = (rgb[:, 0].astype(np.int64) << 16) | (rgb[:, 1].astype(np.int64) << 8) | rgb[:, 2]
    u, c = np.unique(key, return_counts=True)
    order = np.argsort(-c)
    u, c = u[order], c[order]
    keep = c >= min_share * c.sum()
    u, c = u[keep], c[keep]
    cols = np.stack([(u >> 16) & 255, (u >> 8) & 255, u & 255], axis=1).astype(np.uint8)
    return cols, c


CANVAS = 1024        # working resolution for segmentation
MASTER = 2048        # master resolution for rendering
CONTENT = 0.76       # content box = 76% of the canvas (12% padding each side)


def normalize(rgba, size=CANVAS, content=CONTENT):
    """Crop to the alpha bbox and fit it, centered, into a square canvas of `size`.

    Returns (image, transform) where transform maps source (x, y) -> canvas (x, y) as a 2x3 matrix.
    """
    a = rgba[..., 3]
    ys, xs = np.nonzero(a > 8)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    w, h = x1 - x0, y1 - y0
    s = content * size / max(w, h)
    tx = (size - w * s) / 2 - x0 * s
    ty = (size - h * s) / 2 - y0 * s
    m = np.array([[s, 0, tx], [0, s, ty]], dtype=np.float32)
    out = warp(rgba, m, size)
    return out, m


def warp(rgba, m, size, interp=cv2.INTER_AREA):
    """Affine-warp an RGBA image with premultiplied alpha so edges stay clean."""
    f = rgba.astype(np.float32)
    alpha = f[..., 3:4] / 255.0
    pre = np.concatenate([f[..., :3] * alpha, f[..., 3:4]], axis=2)
    # INTER_AREA is not supported by warpAffine; downscale with a pre-resize when shrinking a lot.
    scale = float(np.sqrt(abs(np.linalg.det(m[:, :2]))))
    if scale < 0.75 and interp == cv2.INTER_AREA:
        pre = cv2.resize(pre, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
        m = m.copy()
        m[:, :2] = m[:, :2] / scale
        inter = cv2.INTER_LINEAR
    else:
        inter = cv2.INTER_LINEAR if interp == cv2.INTER_AREA else interp
    out = cv2.warpAffine(pre, m, (size, size), flags=inter, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    a = out[..., 3:4]
    rgb = np.where(a > 0, out[..., :3] / np.maximum(a / 255.0, 1e-6), 0)
    return np.clip(np.concatenate([rgb, a], axis=2) + 0.5, 0, 255).astype(np.uint8)
