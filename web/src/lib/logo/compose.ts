import { mix } from "../color";
import { BOX, BOX_SMALL, markGeometry, matrixAttr, type BoxParams } from "./geometry";
import { paintFor } from "./palette";
import { pictoMarkup, type LucideSet } from "./picto";
import { shapeText, sizeForCap, type FontSet, type TextShape } from "./text";
import type { Layout, LogoSpec, Paint, Scheme } from "./types";

/** Loaded resources every rendering needs. */
export interface Kit {
  font: FontSet;
  lucide: LucideSet | null;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Proportions of the existing lockups, relative to the mark's height. */
export const LOCKUP = {
  /** Cap height of the two stacked lines. */
  capStacked: 0.354,
  /** Cap height of the one-line version. */
  capRow: 0.405,
  /** Gap between mark and text. */
  gap: 0.1,
  /** Baseline to baseline of the stacked lines, in cap heights. */
  lead: 1.09,
  /** Space between the family word and the name on one line, in em. */
  wordGap: 0.16,
  /** Margin kept around exported artwork. */
  pad: 0.05,
};

const r2 = (v: number) => Math.round(v * 100) / 100;

function fillTokens(markup: string, paint: Paint): string {
  return markup.replace(/\{B\}/g, paint.pb).replace(/\{D\}/g, paint.pd);
}

function svgDoc(vb: Rect, body: string, px?: { w: number; h: number }, title?: string): string {
  const size = px ? ` width="${Math.round(px.w)}" height="${Math.round(px.h)}"` : "";
  const t = title ? `<title>${title.replace(/[<&]/g, "")}</title>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${r2(vb.x)} ${r2(vb.y)} ${r2(vb.w)} ${r2(vb.h)}"${size}>${t}${body}</svg>`;
}

/** The box mark as SVG elements, centered on (cx, cy). */
export function markBody(
  spec: LogoSpec,
  kit: Kit,
  scheme: Scheme,
  params: BoxParams = BOX,
  cx = 512,
  cy = 512,
): { body: string; bbox: Rect; reach: number } {
  const g = markGeometry(params, cx, cy);
  const paint = paintFor(spec, scheme);
  const pic = fillTokens(pictoMarkup(spec.picto, kit.lucide, params.pictoWeight), paint);
  const body =
    `<path d="${g.top}" fill="${paint.face}"/>` +
    `<path d="${g.left}" fill="${paint.face}" fill-rule="evenodd"/>` +
    `<path d="${g.panel}" fill="${paint.panel}" fill-rule="evenodd"/>` +
    `<g transform="${matrixAttr(g.picto)}">${pic}</g>`;
  return { body, bbox: g.bbox, reach: g.reach };
}

export interface SvgOut {
  svg: string;
  /** Aspect ratio (width / height) of the artwork. */
  ratio: number;
}

function out(vb: Rect, body: string, title: string, heightPx?: number): SvgOut {
  const ratio = vb.w / vb.h;
  const px = heightPx ? { w: heightPx * ratio, h: heightPx } : undefined;
  return { svg: svgDoc(vb, body, px, title), ratio };
}

function title(spec: LogoSpec): string {
  return `${spec.family} ${spec.name}`.trim();
}

/**
 * Square mark. By default it keeps margins like the original files; `tight` crops close to the
 * artwork (favicons and side-by-side views), `small` switches to the small-size drawing.
 */
export function markSvg(
  spec: LogoSpec,
  kit: Kit,
  scheme: Scheme,
  opts: { small?: boolean; tight?: boolean; px?: number } = {},
): SvgOut {
  const m = markBody(spec, kit, scheme, opts.small ? BOX_SMALL : BOX);
  if (opts.small || opts.tight) {
    const side = Math.max(m.bbox.w, m.bbox.h) * 1.04;
    const vb = { x: 512 - side / 2, y: 512 - side / 2, w: side, h: side };
    return out(vb, m.body, title(spec), opts.px);
  }
  return out({ x: 0, y: 0, w: 1024, h: 1024 }, m.body, title(spec), opts.px);
}

interface Lines {
  body: string;
  box: Rect;
}

function place(shape: TextShape, x: number, y: number, fill: string): string {
  return shape.d ? `<path transform="translate(${r2(x)} ${r2(y)})" d="${shape.d}" fill="${fill}"/>` : "";
}

/** Family word and name, left-aligned or centered, starting at x (or centered on x). */
function textBlock(spec: LogoSpec, kit: Kit, paint: Paint, layout: Layout, cap: number, x: number, centered: boolean): Lines {
  const size = sizeForCap(kit.font, cap);
  const fam = shapeText(kit.font, spec.family.trim(), size);
  const name = shapeText(kit.font, spec.name.trim() || "Nama", size);
  const hasFam = spec.family.trim().length > 0;

  if (layout === "baris" || !hasFam) {
    const gap = hasFam ? LOCKUP.wordGap * size : 0;
    const width = (hasFam ? fam.width + gap : 0) + name.width;
    const x0 = centered ? x - width / 2 : x;
    const y = cap / 2;
    const body = (hasFam ? place(fam, x0, y, paint.family) : "") + place(name, x0 + (hasFam ? fam.width + gap : 0), y, paint.name);
    const top = y + Math.min(hasFam ? fam.top : 0, name.top);
    const bottom = y + Math.max(hasFam ? fam.bottom : 0, name.bottom);
    return { body, box: { x: x0, y: top, w: width, h: bottom - top } };
  }

  const y1 = 0;
  const y2 = LOCKUP.lead * cap;
  const width = Math.max(fam.width, name.width);
  const x1 = centered ? x - fam.width / 2 : x;
  const x2 = centered ? x - name.width / 2 : x;
  const body = place(fam, x1, y1, paint.family) + place(name, x2, y2, paint.name);
  const top = y1 + fam.top;
  const bottom = y2 + Math.max(name.bottom, 0);
  return { body, box: { x: centered ? x - width / 2 : x, y: top, w: width, h: bottom - top } };
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

function padded(r: Rect, p: number): Rect {
  return { x: r.x - p, y: r.y - p, w: r.w + 2 * p, h: r.h + 2 * p };
}

/** Mark with the family word and name beside it. */
export function lockupSvg(spec: LogoSpec, kit: Kit, scheme: Scheme, layout: Layout, heightPx?: number): SvgOut {
  const m = markBody(spec, kit, scheme, BOX, 0, 0);
  const MH = m.bbox.h;
  const cap = (layout === "baris" ? LOCKUP.capRow : LOCKUP.capStacked) * MH;
  const x = m.bbox.x + m.bbox.w + LOCKUP.gap * MH;
  const t = textBlock(spec, kit, paintFor(spec, scheme), layout, cap, x, false);
  const vb = padded(union(m.bbox, t.box), LOCKUP.pad * MH);
  return out(vb, m.body + t.body, title(spec), heightPx);
}

/** Text only: the two words stacked and centered, or on one line. */
export function wordmarkSvg(spec: LogoSpec, kit: Kit, scheme: Scheme, layout: Layout, heightPx?: number): SvgOut {
  const MH = markGeometry(BOX).bbox.h;
  const cap = (layout === "baris" ? LOCKUP.capRow : LOCKUP.capStacked) * MH;
  const t = textBlock(spec, kit, paintFor(spec, scheme), layout, cap, 0, true);
  const vb = padded(t.box, LOCKUP.pad * MH);
  return out(vb, t.body, title(spec), heightPx);
}

/* ---------- app icons ---------- */

export type IconStyle = "terang" | "tint" | "gelap";

export const ICON_STYLES: { id: IconStyle; label: string }[] = [
  { id: "terang", label: "Putih" },
  { id: "tint", label: "Tint" },
  { id: "gelap", label: "Warna gelap" },
];

export function iconBackground(spec: LogoSpec, style: IconStyle): string {
  if (style === "gelap") return spec.dark;
  if (style === "tint") return mix(spec.bright, "#FFFFFF", 0.9);
  return "#FFFFFF";
}

export type IconShape = "persegi" | "rounded" | "lingkaran" | "tanpa-latar";

export interface IconOpts {
  style: IconStyle;
  shape: IconShape;
  /** Diameter the mark may use, as a fraction of the icon (keeps it inside round masks). */
  safe: number;
  /** Single-color white mark (Android themed-icon layer). */
  mono?: boolean;
  px?: number;
}

/** Square app icon: background shape plus the mark scaled to the safe zone. */
export function appIconSvg(spec: LogoSpec, kit: Kit, opts: IconOpts): SvgOut {
  const scheme: Scheme = opts.mono || opts.style === "gelap" ? "putih" : "warna";
  const m = markBody(spec, kit, scheme);
  const s = (opts.safe * 512) / m.reach;
  const bg = iconBackground(spec, opts.style);
  let back = "";
  if (opts.shape === "persegi") back = `<rect width="1024" height="1024" fill="${bg}"/>`;
  if (opts.shape === "rounded") back = `<rect width="1024" height="1024" rx="228" fill="${bg}"/>`;
  if (opts.shape === "lingkaran") back = `<circle cx="512" cy="512" r="512" fill="${bg}"/>`;
  const body = `${back}<g transform="translate(512 512) scale(${s.toFixed(4)}) translate(-512 -512)">${m.body}</g>`;
  return out({ x: 0, y: 0, w: 1024, h: 1024 }, body, title(spec), opts.px);
}

/** Favicon: small version of the mark that switches to the dark-background colors in dark mode. */
export function faviconSvg(spec: LogoSpec, kit: Kit): string {
  const light = markBody(spec, kit, "warna", BOX_SMALL);
  const dark = markBody(spec, kit, "gelap", BOX_SMALL);
  const side = Math.max(light.bbox.w, light.bbox.h) * 1.04;
  const vb = { x: 512 - side / 2, y: 512 - side / 2, w: side, h: side };
  const css = `<style>.d{display:none}@media (prefers-color-scheme:dark){.l{display:none}.d{display:inline}}</style>`;
  return svgDoc(vb, `${css}<g class="l">${light.body}</g><g class="d">${dark.body}</g>`, undefined, title(spec));
}

/** Preview background that suits a scheme. */
export function schemeBackground(scheme: Scheme): string {
  if (scheme === "gelap" || scheme === "putih") return "#101218";
  return "#FFFFFF";
}
