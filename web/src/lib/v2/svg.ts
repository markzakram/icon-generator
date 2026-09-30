import { badgeMarkup, type Badge } from "./badges";
import type { V2Glyph } from "./glyphs";
import type { V2Tokens } from "./tokens";

/** At or below this size (px, or dp for app platforms) the simple variant drops the fine details. */
export const SIMPLE_MAX = 48;

const TOKEN_RE = /\{(PD|P|AD|AX|A|LD|L|OP|OA|OL)\}/g;

export function fillTokens(markup: string, tokens: V2Tokens): string {
  return markup.replace(TOKEN_RE, (_, k: keyof V2Tokens) => tokens[k]);
}

export function simplify(markup: string): string {
  return markup.replace(/<g class="fine">[\s\S]*?<\/g>/g, "");
}

/** Full SVG document for a v2 glyph in a brand, optionally with a badge. */
export function v2Svg(
  glyph: V2Glyph,
  tokens: V2Tokens,
  opts: { size?: number; simple?: boolean; badge?: Badge | null } = {},
): string {
  const body = opts.simple ? simplify(glyph.svg) : glyph.svg;
  const size = opts.size ?? 96;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="${size}" height="${size}">` +
    fillTokens(body + badgeMarkup(opts.badge), tokens) +
    `</svg>`
  );
}

/** Badge alone, transparent elsewhere: drawn over v1 raster icons. */
export function badgeSvg(badge: Badge, tokens: V2Tokens, size: number): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="${size}" height="${size}">` +
    fillTokens(badgeMarkup(badge), tokens) +
    `</svg>`
  );
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export async function svgImage(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = svgDataUrl(svg);
  await img.decode();
  return img;
}
