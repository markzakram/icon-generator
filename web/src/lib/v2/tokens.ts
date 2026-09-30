import { contrast, hueDiff, lch, mix, shift } from "../color";
import type { Brand } from "../types";

/**
 * Icon v2 color tokens. Every v2 glyph is drawn only with these, so any brand renders exactly.
 * Rules (Panduan v2):
 *  - a 3D side is always the deep version of the face it belongs to (PD for P, AD for A, LD for L);
 *  - details sit on a face in its "on" color, picked by contrast so they always read.
 */
export interface V2Tokens {
  /** Primary face. */
  P: string;
  /** Deep primary: 3D side of primary shapes. */
  PD: string;
  /** Accent face. */
  A: string;
  /** Deep accent. */
  AD: string;
  /** Light face (paper, screens). */
  L: string;
  /** Deep light. */
  LD: string;
  /** Detail on primary. */
  OP: string;
  /** Detail on accent. */
  OA: string;
  /** Detail on light. */
  OL: string;
  /** Accent drawn straight on the page (route dots, sound waves): falls back to AD when A is too pale. */
  AX: string;
}

export type TokenName = keyof V2Tokens;

export const TOKEN_NAMES: TokenName[] = ["P", "PD", "A", "AD", "L", "LD", "OP", "OA", "OL", "AX"];

export const TOKEN_LABELS: Record<TokenName, string> = {
  P: "Primer",
  PD: "Sisi 3D primer",
  A: "Aksen",
  AD: "Sisi 3D aksen",
  L: "Terang",
  LD: "Sisi 3D terang",
  OP: "Detail di primer",
  OA: "Detail di aksen",
  OL: "Detail di terang",
  AX: "Aksen di atas latar",
};

const INK = "#221F1F";

/**
 * A usable 3D side for `face`: clearly darker, and a related hue (within 70 degrees, so a brand's
 * navy side on teal still counts) unless either color is near-neutral.
 */
function isDeepOf(face: string, cand: string | undefined): cand is string {
  if (!cand) return false;
  const [L1, C1, h1] = lch(face);
  const [L2, C2, h2] = lch(cand);
  if (L2 > L1 - 8) return false;
  if (C1 < 12 || C2 < 12) return true;
  return hueDiff(h1, h2) <= 70;
}

function deep(face: string, candidates: (string | undefined)[]): string {
  return candidates.find((c) => isDeepOf(face, c)) ?? shift(face, 0.55, 0, 0.9);
}

/** Details are large shapes, so a 2.2:1 contrast reads well; below that the next candidate is used. */
const DETAIL_CONTRAST = 2.2;

function onColor(face: string, candidates: string[]): string {
  return (
    candidates.find((c) => contrast(c, face) >= DETAIL_CONTRAST) ??
    (contrast(INK, face) > contrast("#FFFFFF", face) ? INK : "#FFFFFF")
  );
}

export function v2Tokens(brand: Brand): V2Tokens {
  const r = brand.roles;
  const P = r.primary;
  const A = r.accent;
  const L = r.light;
  // a custom brand's explicit 3D color is honored; built-in roles are only used when they are a true deep shade
  const PD =
    brand.custom && brand.given.primary_shade
      ? brand.given.primary_shade
      : deep(P, [r.primary_shade, r.primary_alt, r.dark]);
  const AD = brand.custom && brand.given.accent_shade ? brand.given.accent_shade : deep(A, [r.accent_shade]);
  const LD = mix(L, PD, 0.28);
  return {
    P,
    PD,
    A,
    AD,
    L,
    LD,
    OP: onColor(P, [L, r.dark, PD]),
    OA: onColor(A, [L, PD, r.dark]),
    OL: contrast(A, L) >= 2.2 ? A : P,
    AX: contrast(A, "#FFFFFF") >= 1.4 ? A : AD,
  };
}
