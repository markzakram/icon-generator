import { contrast, hueDiff, labToRgb, lch, mix, rgbToHex, rgbToLab } from "../color";
import type { LogoSpec, Paint, Scheme } from "./types";

/** Background assumed by the "gelap" scheme (dark app headers, dark mode). */
export const DARK_BG = "#101218";

export interface Swatch {
  nama: string;
  bright: string;
  dark: string;
}

/** Curated pairs. The first four are the colors of the existing apps, measured from their files. */
export const SWATCHES: Swatch[] = [
  { nama: "Ungu", bright: "#9437FB", dark: "#3E01C9" },
  { nama: "Hijau", bright: "#01BC50", dark: "#035F34" },
  { nama: "Merah", bright: "#F90220", dark: "#8F011E" },
  { nama: "Biru muda", bright: "#00AFEC", dark: "#012E70" },
  { nama: "Oranye", bright: "#FF7A1A", dark: "#8A3300" },
  { nama: "Kuning", bright: "#DB9700", dark: "#664503" },
  { nama: "Toska", bright: "#0FB5A6", dark: "#07504C" },
  { nama: "Magenta", bright: "#E91E8C", dark: "#7D0A4A" },
  { nama: "Indigo", bright: "#4F63FF", dark: "#1B2585" },
  { nama: "Lime", bright: "#6CB00C", dark: "#2F5500" },
  { nama: "Cokelat", bright: "#C87533", dark: "#5A2E10" },
  { nama: "Slate", bright: "#5B7390", dark: "#1D2939" },
];

function lchToHex(L: number, C: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  // shrink chroma until the color is inside sRGB (labToRgb clamps silently, so compare the round trip)
  let c = C;
  for (let i = 0; i < 24; i++) {
    const lab: [number, number, number] = [L, c * Math.cos(rad), c * Math.sin(rad)];
    const rgb = labToRgb(lab);
    const back = rgbToLab(rgb);
    if (Math.hypot(back[0] - lab[0], back[1] - lab[1], back[2] - lab[2]) < 1.5) return rgbToHex(rgb);
    c *= 0.9;
  }
  return rgbToHex(labToRgb([L, 0, 0]));
}

/** Deep partner of a bright color, the way the existing pairs are built (about half the lightness). */
export function deriveDark(bright: string): string {
  const [L, C, h] = lch(bright);
  return lchToHex(Math.min(32, Math.max(17, L * 0.5)), C * 0.95, h);
}

/** The bright color lifted until it reads on DARK_BG. */
export function brightOnDark(bright: string): string {
  const [L, C, h] = lch(bright);
  let l = L;
  let out = bright;
  while (contrast(out, DARK_BG) < 4 && l < 92) {
    l += 3;
    out = lchToHex(l, C, h);
  }
  return out;
}

/** Very light tint of the product color: box faces in the "gelap" scheme. */
export function faceTint(bright: string): string {
  return mix(bright, "#FFFFFF", 0.86);
}

export function paintFor(spec: Pick<LogoSpec, "dark" | "bright">, scheme: Scheme): Paint {
  if (scheme === "gelap") {
    const face = faceTint(spec.bright);
    const b = brightOnDark(spec.bright);
    return { face, panel: b, pb: b, pd: face, family: "#FFFFFF", name: b };
  }
  if (scheme === "hitam" || scheme === "putih") {
    const c = scheme === "hitam" ? "#111318" : "#FFFFFF";
    return { face: c, panel: c, pb: c, pd: c, family: c, name: c };
  }
  return { face: spec.dark, panel: spec.bright, pb: spec.bright, pd: spec.dark, family: spec.dark, name: spec.bright };
}

/** How far (hue degrees) a color is from the nearest other product; small means easy to confuse. */
export function nearestHue(bright: string, others: string[]): { diff: number; index: number } {
  const [, C, h] = lch(bright);
  let best = { diff: 360, index: -1 };
  others.forEach((o, index) => {
    const [, C2, h2] = lch(o);
    // near-grey colors have no reliable hue: compare by chroma instead
    const diff = C < 15 || C2 < 15 ? Math.abs(C - C2) * 3 : hueDiff(h, h2);
    if (diff < best.diff) best = { diff, index };
  });
  return best;
}

/** Swatches ordered from most to least distinct against the colors already used. */
export function rankSwatches(used: string[]): (Swatch & { diff: number })[] {
  return SWATCHES.map((s) => ({ ...s, diff: used.length ? nearestHue(s.bright, used).diff : 360 })).sort(
    (a, b) => b.diff - a.diff,
  );
}
