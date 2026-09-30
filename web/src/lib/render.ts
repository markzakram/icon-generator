import { hexToRgb, type RGB } from "./color";
import { dataUrl } from "./data";
import { ROLE_NAMES, type Brand, type Glyph, type RoleName, type RolesData, type Version } from "./types";
import type { Badge } from "./v2/badges";
import { V2_BY_ID } from "./v2/glyphs";
import { badgeSvg, SIMPLE_MAX, svgImage, v2Svg } from "./v2/svg";
import { v2Tokens } from "./v2/tokens";

export type Surface = HTMLCanvasElement | OffscreenCanvas;
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Source = "resmi" | "generate";

export function makeCanvas(w: number, h: number): Surface {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function ctx2d(c: Surface, readBack = false): Ctx {
  const x = c.getContext("2d", { willReadFrequently: readBack }) as Ctx | null;
  if (!x) throw new Error("Canvas 2D tidak tersedia di browser ini");
  return x;
}

async function loadBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal memuat ${url}`);
  return createImageBitmap(await res.blob(), { premultiplyAlpha: "none", colorSpaceConversion: "none" });
}

/** Region map of a glyph: which color region every pixel belongs to, plus its alpha. */
interface GlyphMap {
  w: number;
  h: number;
  region: Uint8Array;
  alpha: Uint8Array;
}

const mapCache = new Map<string, Promise<GlyphMap>>();

function loadMap(id: string, thumb: boolean): Promise<GlyphMap> {
  const key = `${id}|${thumb}`;
  let p = mapCache.get(key);
  if (!p) {
    p = loadBitmap(dataUrl(`maps/${id}${thumb ? ".thumb" : ""}.png`)).then((bmp) => {
      const c = makeCanvas(bmp.width, bmp.height);
      const x = ctx2d(c, true);
      x.drawImage(bmp, 0, 0);
      const d = x.getImageData(0, 0, bmp.width, bmp.height).data;
      const n = bmp.width * bmp.height;
      const region = new Uint8Array(n);
      const alpha = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        region[i] = d[i * 4];
        alpha[i] = d[i * 4 + 1];
      }
      return { w: bmp.width, h: bmp.height, region, alpha };
    });
    p.catch(() => mapCache.delete(key));
    mapCache.set(key, p);
  }
  return p;
}

const originalCache = new Map<string, Promise<ImageBitmap>>();

function loadOriginal(slug: string, id: string, thumb: boolean): Promise<ImageBitmap> {
  const key = `${slug}|${id}|${thumb}`;
  let p = originalCache.get(key);
  if (!p) {
    p = loadBitmap(dataUrl(`originals/${slug}/${id}${thumb ? ".thumb" : ""}.png`));
    p.catch(() => originalCache.delete(key));
    originalCache.set(key, p);
  }
  return p;
}

/** Existing-first: an official icon wins unless the caller forces the generated version. */
export function sourceFor(glyph: Glyph, brand: Brand, force = false): Source {
  return !force && !brand.custom && glyph.official.includes(brand.slug) ? "resmi" : "generate";
}

/** The role of every region for this brand; custom brands copy their style reference. */
export function roleListFor(roles: RolesData, glyphId: string, brand: Brand): string[] {
  const g = roles[glyphId];
  if (!g) return [];
  if (brand.custom && brand.styleRef) {
    return g.observed[brand.styleRef] ?? g.predicted[brand.styleRef] ?? [];
  }
  return g.predicted[brand.slug] ?? [];
}

export function paletteFor(roleList: string[], brand: Brand): RGB[] {
  return roleList.map((r) =>
    hexToRgb(r.startsWith("#") ? r : (brand.roles[r as RoleName] ?? brand.roles.primary)),
  );
}

function paint(map: GlyphMap, palette: RGB[]): ImageData {
  const out = new ImageData(map.w, map.h);
  const o = out.data;
  const n = map.w * map.h;
  for (let i = 0; i < n; i++) {
    const r = map.region[i];
    if (r === 255) continue;
    const c = palette[r] ?? [255, 0, 255];
    const j = i * 4;
    o[j] = c[0];
    o[j + 1] = c[1];
    o[j + 2] = c[2];
    o[j + 3] = map.alpha[i];
  }
  return out;
}

export async function renderBase(
  glyph: Glyph,
  brand: Brand,
  roles: RolesData,
  opts: { thumb: boolean; force?: boolean },
): Promise<{ surface: Surface; source: Source }> {
  const source = sourceFor(glyph, brand, opts.force);
  if (source === "resmi") {
    const bmp = await loadOriginal(brand.slug, glyph.id, opts.thumb);
    const c = makeCanvas(bmp.width, bmp.height);
    ctx2d(c).drawImage(bmp, 0, 0);
    return { surface: c, source };
  }
  const map = await loadMap(glyph.id, opts.thumb);
  const c = makeCanvas(map.w, map.h);
  ctx2d(c).putImageData(paint(map, paletteFor(roleListFor(roles, glyph.id, brand), brand)), 0, 0);
  return { surface: c, source };
}

function isSurface(x: Surface | ImageBitmap): x is Surface {
  return (
    (typeof HTMLCanvasElement !== "undefined" && x instanceof HTMLCanvasElement) ||
    (typeof OffscreenCanvas !== "undefined" && x instanceof OffscreenCanvas)
  );
}

function drawScaled(src: Surface | ImageBitmap, size: number): Surface {
  const next = makeCanvas(size, size);
  const x = ctx2d(next);
  x.imageSmoothingEnabled = true;
  x.imageSmoothingQuality = "high";
  x.drawImage(src, 0, 0, size, size);
  return next;
}

/** Downscale in halving steps so small sizes stay sharp and clean. */
export function resizeTo(src: Surface | ImageBitmap, size: number): Surface {
  let cur: Surface | ImageBitmap = src;
  let w = src.width;
  while (w / 2 >= size) {
    w = Math.round(w / 2);
    cur = drawScaled(cur, w);
  }
  return w === size && isSurface(cur) ? cur : drawScaled(cur, size);
}

/** Like resizeTo, but never hands back `src` itself, so the result can be drawn on. */
export function resizeCopy(src: Surface, size: number): Surface {
  const out = resizeTo(src, size);
  return out === src ? drawScaled(src, size) : out;
}

// ---------------------------------------------------------------- v1 + v2 in one place

export function hasV2(glyph: Glyph): boolean {
  return V2_BY_ID.has(glyph.id);
}

/** The version actually drawn: v2 only exists for some glyphs, the rest fall back to v1. */
export function effectiveVersion(glyph: Glyph, version: Version): Version {
  return version === "v2" && hasV2(glyph) ? "v2" : "v1";
}

/** What the user sees on a card: new v2 drawing, official v1 icon, or v1 made by the generator. */
export function iconKind(glyph: Glyph, brand: Brand, version: Version, force = false): "v2" | Source {
  return effectiveVersion(glyph, version) === "v2" ? "v2" : sourceFor(glyph, brand, force);
}

export function displayName(glyph: Glyph, version: Version): string {
  return (effectiveVersion(glyph, version) === "v2" && V2_BY_ID.get(glyph.id)?.nama) || glyph.nama;
}

export interface IconOpts {
  version: Version;
  /** v1 only: show the generated drawing even when an official icon exists. */
  force?: boolean;
  badge?: Badge | null;
}

/** SVG document of a v2 icon (null when the glyph has no v2 drawing). */
export function v2SvgFor(glyph: Glyph, brand: Brand, badge: Badge | null | undefined, size = 96, simple = false): string | null {
  const def = V2_BY_ID.get(glyph.id);
  return def ? v2Svg(def, v2Tokens(brand), { size, simple, badge }) : null;
}

/**
 * Returns a function that renders the icon at any pixel size. v1 icons are painted once at 1024 px
 * and scaled down; v2 icons are drawn straight from the vector at each size.
 */
export async function iconRenderer(
  glyph: Glyph,
  brand: Brand,
  roles: RolesData,
  opts: IconOpts,
): Promise<(size: number, simple?: boolean) => Promise<Surface>> {
  const tokens = v2Tokens(brand);
  if (effectiveVersion(glyph, opts.version) === "v2") {
    const def = V2_BY_ID.get(glyph.id)!;
    return async (size, simple = size <= SIMPLE_MAX) => {
      const img = await svgImage(v2Svg(def, tokens, { size, simple, badge: opts.badge }));
      const c = makeCanvas(size, size);
      ctx2d(c).drawImage(img, 0, 0, size, size);
      return c;
    };
  }
  const { surface } = await renderBase(glyph, brand, roles, { thumb: false, force: opts.force });
  return async (size) => {
    const out = resizeCopy(surface, size);
    if (opts.badge) {
      const img = await svgImage(badgeSvg(opts.badge, tokens, size));
      ctx2d(out).drawImage(img, 0, 0, size, size);
    }
    return out;
  };
}

export async function renderIconAt(
  glyph: Glyph,
  brand: Brand,
  roles: RolesData,
  size: number,
  opts: IconOpts,
): Promise<Surface> {
  return (await iconRenderer(glyph, brand, roles, opts))(size);
}

let encoder: HTMLCanvasElement | null = null;

/** Whether this browser can encode the image type (toDataURL falls back to PNG when it cannot). */
export function canEncode(type: string): boolean {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  return c.toDataURL(type).startsWith(`data:${type}`);
}

/**
 * Encode a surface as an image file. Uses toDataURL on purpose: Chrome encodes PNG from
 * toBlob()/convertToBlob() in idle time, which costs up to ~1 s per file while the page is busy.
 */
export async function toBlob(s: Surface, type = "image/png"): Promise<Blob> {
  let el: HTMLCanvasElement;
  if (typeof HTMLCanvasElement !== "undefined" && s instanceof HTMLCanvasElement) {
    el = s;
  } else {
    encoder ??= document.createElement("canvas");
    encoder.width = s.width;
    encoder.height = s.height;
    const x = encoder.getContext("2d");
    if (!x) throw new Error("Canvas 2D tidak tersedia di browser ini");
    x.drawImage(s, 0, 0);
    el = encoder;
  }
  const url = el.toDataURL(type);
  if (!url.startsWith(`data:${type}`)) throw new Error(`Browser ini tidak bisa membuat ${type}`);
  const bin = atob(url.slice(url.indexOf(",") + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export function brandKey(b: Brand): string {
  return `${b.slug}|${b.custom ? "c" : "b"}|${b.styleRef ?? ""}|${ROLE_NAMES.map((r) => b.roles[r]).join(",")}`;
}

const rendered = new Map<string, Promise<{ bitmap: ImageBitmap; source: Source }>>();

/** Rendered icons are cached per glyph, brand colors, size and mode. */
export function renderCached(
  glyph: Glyph,
  brand: Brand,
  roles: RolesData,
  thumb: boolean,
  force = false,
): Promise<{ bitmap: ImageBitmap; source: Source }> {
  const key = `${glyph.id}|${brandKey(brand)}|${thumb}|${force}`;
  let p = rendered.get(key);
  if (!p) {
    p = renderBase(glyph, brand, roles, { thumb, force }).then(async ({ surface, source }) => ({
      bitmap: await createImageBitmap(surface),
      source,
    }));
    p.catch(() => rendered.delete(key));
    rendered.set(key, p);
    if (rendered.size > 1200) {
      const oldest = rendered.keys().next().value;
      if (oldest) rendered.delete(oldest);
    }
  }
  return p;
}
