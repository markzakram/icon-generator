import latinUrl from "@fontsource/gabarito/files/gabarito-latin-900-normal.woff?url";
import extUrl from "@fontsource/gabarito/files/gabarito-latin-ext-900-normal.woff?url";
import { parse, type Font, type Glyph } from "opentype.js";
import { dataUrl } from "../data";

/**
 * Wordmarks are set in Gabarito Black and converted to outlines, so exported SVGs look the same
 * everywhere without the font installed. A user can load another font file (e.g. the original one).
 */

export interface FontSet {
  /** Tried in order for every character (latin, then latin-ext). */
  fonts: Font[];
  /** Kerning by character pair, in font units (opentype.js cannot read this font's own table). */
  kern: Record<string, number>;
  label: string;
  custom: boolean;
}

/** Tight tracking of the existing wordmarks, in em. */
export const TRACKING = -0.015;

async function fontAt(url: string): Promise<Font> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font gagal dimuat (${url})`);
  return parse(await res.arrayBuffer());
}

let gabarito: Promise<FontSet> | null = null;

export function loadGabarito(): Promise<FontSet> {
  gabarito ??= Promise.all([
    fontAt(latinUrl),
    fontAt(extUrl),
    fetch(dataUrl("logo/kern.json")).then((r) => (r.ok ? (r.json() as Promise<Record<string, number>>) : {})),
  ]).then(([latin, ext, kern]) => ({ fonts: [latin, ext], kern, label: "Gabarito Black", custom: false }));
  gabarito.catch(() => (gabarito = null));
  return gabarito;
}

export async function fontFromFile(file: File): Promise<FontSet> {
  const font = parse(await file.arrayBuffer());
  const family = font.names.fontFamily?.en ?? file.name.replace(/\.[^.]+$/, "");
  const style = font.names.fontSubfamily?.en ?? "";
  return { fonts: [font], kern: {}, label: `${family} ${style}`.trim(), custom: true };
}

export interface TextShape {
  /** Outline path, baseline at y = 0, starting at x = 0. */
  d: string;
  /** Advance width. */
  width: number;
  /** Cap height for this size (used to line text up with the mark). */
  cap: number;
  /** Ink extents relative to the baseline (top is negative). */
  top: number;
  bottom: number;
  /** Characters the font does not have. */
  missing: string[];
}

function glyphFor(set: FontSet, ch: string): { font: Font; glyph: Glyph } | null {
  for (const font of set.fonts) {
    const glyph = font.charToGlyph(ch);
    if (glyph && glyph.index !== 0) return { font, glyph };
  }
  return null;
}

function capHeight(font: Font): number {
  return font.tables.os2?.sCapHeight || font.ascender * 0.72;
}

/** Lays out one line: per-character glyphs (no shaping needed for Latin names), kerning, tracking. */
export function shapeText(set: FontSet, text: string, size: number, tracking = TRACKING): TextShape {
  const chars = [...text];
  let x = 0;
  let d = "";
  let top = 0;
  let bottom = 0;
  const missing: string[] = [];
  const main = set.fonts[0];
  chars.forEach((ch, i) => {
    const hit = glyphFor(set, ch);
    if (!hit) {
      if (ch.trim()) missing.push(ch);
      x += size * 0.26;
      return;
    }
    const { font, glyph } = hit;
    const scale = size / font.unitsPerEm;
    if (ch.trim()) {
      const path = glyph.getPath(x, 0, size);
      d += path.toPathData(2);
      const bb = path.getBoundingBox();
      if (Number.isFinite(bb.y1)) {
        top = Math.min(top, bb.y1);
        bottom = Math.max(bottom, bb.y2);
      }
    }
    x += (glyph.advanceWidth ?? font.unitsPerEm * 0.5) * scale;
    const next = chars[i + 1];
    if (next) {
      const pair = set.custom ? kernCustom(set, ch, next) : (set.kern[ch + next] ?? 0);
      x += pair * scale + tracking * size;
    }
  });
  return { d, width: x, cap: (capHeight(main) / main.unitsPerEm) * size, top, bottom, missing };
}

function kernCustom(set: FontSet, a: string, b: string): number {
  const font = set.fonts[0];
  try {
    return font.getKerningValue(font.charToGlyph(a), font.charToGlyph(b));
  } catch {
    return 0;
  }
}

/** Size that gives the wanted cap height. */
export function sizeForCap(set: FontSet, cap: number): number {
  const f = set.fonts[0];
  return (cap * f.unitsPerEm) / capHeight(f);
}
