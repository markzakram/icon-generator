import Fuse from "fuse.js";
import type { Glyph } from "./types";

export function makeFuse(glyphs: Glyph[]): Fuse<Glyph> {
  return new Fuse(glyphs, {
    keys: [
      { name: "nama", weight: 3 },
      { name: "id", weight: 2 },
      { name: "alias", weight: 2 },
      { name: "sinonim", weight: 1.5 },
    ],
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
}

/** Standard 16 first (in their order), then the glyphs most brands share. */
export function sortDefault(glyphs: Glyph[], standard: string[]): Glyph[] {
  const idx = new Map(standard.map((id, i) => [id, i]));
  return [...glyphs].sort(
    (a, b) =>
      (idx.get(a.id) ?? 999) - (idx.get(b.id) ?? 999) ||
      b.brandCount - a.brandCount ||
      a.nama.localeCompare(b.nama, "id"),
  );
}

export function searchGlyphs(fuse: Fuse<Glyph>, glyphs: Glyph[], query: string, standard: string[]): Glyph[] {
  const q = query.trim();
  if (!q) return sortDefault(glyphs, standard);
  return fuse.search(q).map((r) => r.item);
}
