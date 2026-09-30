import type { Roles } from "./types";

export type RGB = [number, number, number];
type Lab = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.trim().replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]: RGB): string {
  const part = (x: number) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

export function isHex(s: string): boolean {
  return /^#?[0-9a-fA-F]{6}$/.test(s.trim());
}

export function normHex(s: string): string {
  return `#${s.trim().replace("#", "").toUpperCase()}`;
}

const toLinear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLinear = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const D = 6 / 29;
const f = (t: number) => (t > D ** 3 ? Math.cbrt(t) : t / (3 * D * D) + 4 / 29);
const fInv = (t: number) => (t > D ? t ** 3 : 3 * D * D * (t - 4 / 29));
const WHITE: Lab = [0.95047, 1, 1.08883];

export function rgbToLab([r, g, b]: RGB): Lab {
  const R = toLinear(r);
  const G = toLinear(g);
  const B = toLinear(b);
  const X = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / WHITE[0];
  const Y = (0.2126729 * R + 0.7151522 * G + 0.072175 * B) / WHITE[1];
  const Z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / WHITE[2];
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}

export function labToRgb([L, a, b]: Lab): RGB {
  const fy = (L + 16) / 116;
  const X = WHITE[0] * fInv(fy + a / 500);
  const Y = WHITE[1] * fInv(fy);
  const Z = WHITE[2] * fInv(fy - b / 200);
  const R = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const G = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  const B = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;
  return [R, G, B].map((c) => Math.round(Math.min(255, Math.max(0, fromLinear(Math.max(0, c)))))) as RGB;
}

/** Lightness scale/offset and chroma scale in CIELAB, same as the Python pipeline. */
export function shift(hex: string, lScale = 1, lAdd = 0, cScale = 1): string {
  const [L, a, b] = rgbToLab(hexToRgb(hex));
  const L2 = Math.min(99, Math.max(4, L * lScale + lAdd));
  return rgbToHex(labToRgb([L2, a * cScale, b * cScale]));
}

/** Fill the roles a brand did not give, like Roles.complete() in pipeline/predict.py. */
export function completeRoles(given: Partial<Roles> & { primary: string }): Roles {
  const p = given.primary;
  const a = given.accent || p;
  const L = rgbToLab(hexToRgb(p))[0];
  return {
    primary: p,
    accent: a,
    primary_shade: given.primary_shade || shift(p, 0.5, 0, 0.9),
    primary_alt: given.primary_alt || (L < 40 ? shift(p, 1, 12) : shift(p, 1, -14)),
    accent_shade: given.accent_shade || shift(a, 0.5, 0, 0.9),
    light: given.light || "#FFFFFF",
    light_alt: given.light_alt || given.light || "#FFFFFF",
    dark: given.dark || "#221F1F",
  };
}

/** Readable text color on top of a background color. */
export function inkOn(hex: string): string {
  return rgbToLab(hexToRgb(hex))[0] > 62 ? "#14161A" : "#FFFFFF";
}
