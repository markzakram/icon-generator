import JSZip from "jszip";
import { canEncode, effectiveVersion, iconKind, iconRenderer, toBlob, v2SvgFor } from "./render";
import type { Brand, Glyph, RolesData, Version } from "./types";
import { badgeFileSuffix, type Badge } from "./v2/badges";
import { SIMPLE_MAX } from "./v2/svg";

export interface Presets {
  umum: boolean;
  android: boolean;
  ios: boolean;
  web: boolean;
  /** Vector files; only v2 icons have one. */
  svg: boolean;
}

export const ALL_PRESETS: Presets = { umum: true, android: true, ios: true, web: true, svg: true };

export interface ZipItem {
  glyph: Glyph;
  badge?: Badge | null;
}

export const UMUM_SIZES = [1024, 512, 256, 128];
export const ANDROID: [string, number][] = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
];
const IOS: [string, number][] = [
  ["", 1],
  ["@2x", 2],
  ["@3x", 3],
];
const WEB: [string, number][] = [
  ["", 1],
  ["@2x", 2],
];

let webpSupport: boolean | null = null;
function supportsWebp(): boolean {
  webpSupport ??= canEncode("image/webp");
  return webpSupport;
}

/** Number of files one icon produces (v2 icons add two SVG files when requested). */
export function filesPerIcon(p: Presets, isV2: boolean): number {
  return (
    (p.umum ? UMUM_SIZES.length : 0) +
    (p.android ? ANDROID.length : 0) +
    (p.ios ? IOS.length + 1 : 0) +
    (p.web ? WEB.length * (supportsWebp() ? 2 : 1) : 0) +
    (p.svg && isV2 ? 2 : 0)
  );
}

export function fileBase(brand: Brand, glyph: Glyph, badge?: Badge | null): string {
  return `${brand.slug}_${glyph.id}${badgeFileSuffix(badge)}`;
}

export async function buildZip(opts: {
  brand: Brand;
  items: ZipItem[];
  roles: RolesData;
  presets: Presets;
  base: number;
  version: Version;
  force?: boolean;
  onProgress?: (done: number, total: number) => void;
}): Promise<Blob> {
  const { brand, items, roles, presets, base, version, force } = opts;
  const zip = new JSZip();
  const webp = supportsWebp();
  // app platforms use the simple drawing when the base size is small (same rule as Panduan v2)
  const simpleApp = base <= SIMPLE_MAX;
  const log: string[] = [];
  for (let i = 0; i < items.length; i++) {
    const { glyph, badge } = items[i];
    const render = await iconRenderer(glyph, brand, roles, { version, force, badge });
    const name = fileBase(brand, glyph, badge);
    const kind = iconKind(glyph, brand, version, force);
    log.push(`${name}\t${kind}\t${glyph.nama}`);
    if (presets.umum) {
      for (const px of UMUM_SIZES) zip.file(`umum/${name}_${px}.png`, await toBlob(await render(px)));
    }
    if (presets.android) {
      for (const [d, s] of ANDROID) {
        zip.file(`android/drawable-${d}/ic_${name}.png`, await toBlob(await render(Math.round(base * s), simpleApp)));
      }
    }
    if (presets.ios) {
      const dir = `ios/${name}.imageset`;
      const images = [];
      for (const [suffix, s] of IOS) {
        const fn = `${name}${suffix}.png`;
        zip.file(`${dir}/${fn}`, await toBlob(await render(Math.round(base * s), simpleApp)));
        images.push({ idiom: "universal", filename: fn, scale: `${s}x` });
      }
      zip.file(`${dir}/Contents.json`, JSON.stringify({ images, info: { version: 1, author: "icon-generator" } }, null, 2));
    }
    if (presets.web) {
      for (const [suffix, s] of WEB) {
        const c = await render(Math.round(base * s), simpleApp);
        zip.file(`web/${name}${suffix}.png`, await toBlob(c));
        if (webp) zip.file(`web/${name}${suffix}.webp`, await toBlob(c, "image/webp"));
      }
    }
    if (presets.svg && effectiveVersion(glyph, version) === "v2") {
      zip.file(`svg/${name}.svg`, v2SvgFor(glyph, brand, badge, 96, false)!);
      zip.file(`svg/${name}_kecil.svg`, v2SvgFor(glyph, brand, badge, 96, true)!);
    }
    opts.onProgress?.(i + 1, items.length);
  }
  const counts = { v2: 0, resmi: 0, generate: 0 };
  for (const line of log) counts[line.split("\t")[1] as keyof typeof counts]++;
  zip.file(
    "README.txt",
    [
      `Icon ${brand.name} (${brand.slug})`,
      `Dibuat: ${new Date().toLocaleString("id-ID")}`,
      `Ukuran dasar Android/iOS/Web: ${base}${simpleApp ? " (versi sederhana untuk icon v2)" : ""}`,
      `${items.length} icon: ${counts.v2} icon v2, ${counts.resmi} icon resmi v1, ${counts.generate} hasil generate v1`,
      brand.custom ? `Gaya referensi untuk icon v1: ${brand.styleRef}` : "",
      "",
      "file\tjenis\tnama",
      ...log,
    ].join("\n"),
  );
  return zip.generateAsync({ type: "blob" });
}
