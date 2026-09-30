import JSZip from "jszip";
import { canEncode, renderBase, resizeTo, toBlob, type Source } from "./render";
import type { Brand, Glyph, RolesData } from "./types";

export interface Presets {
  umum: boolean;
  android: boolean;
  ios: boolean;
  web: boolean;
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
async function supportsWebp(): Promise<boolean> {
  webpSupport ??= canEncode("image/webp");
  return webpSupport;
}

export async function filesPerGlyph(p: Presets): Promise<number> {
  const webp = await supportsWebp();
  return (
    (p.umum ? UMUM_SIZES.length : 0) +
    (p.android ? ANDROID.length : 0) +
    (p.ios ? IOS.length + 1 : 0) +
    (p.web ? WEB.length * (webp ? 2 : 1) : 0)
  );
}

export function fileBase(brand: Brand, glyph: Glyph): string {
  return `${brand.slug}_${glyph.id}`;
}

export async function buildZip(opts: {
  brand: Brand;
  glyphs: Glyph[];
  roles: RolesData;
  presets: Presets;
  base: number;
  force?: boolean;
  onProgress?: (done: number, total: number) => void;
}): Promise<Blob> {
  const { brand, glyphs, roles, presets, base, force } = opts;
  const zip = new JSZip();
  const webp = await supportsWebp();
  const log: string[] = [];
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const { surface, source } = await renderBase(g, brand, roles, { thumb: false, force });
    const name = fileBase(brand, g);
    log.push(`${g.id}\t${source}\t${g.nama}`);
    if (presets.umum) {
      for (const px of UMUM_SIZES) zip.file(`umum/${name}_${px}.png`, await toBlob(resizeTo(surface, px)));
    }
    if (presets.android) {
      for (const [d, s] of ANDROID) {
        zip.file(`android/drawable-${d}/ic_${name}.png`, await toBlob(resizeTo(surface, Math.round(base * s))));
      }
    }
    if (presets.ios) {
      const dir = `ios/${name}.imageset`;
      const images = [];
      for (const [suffix, s] of IOS) {
        const fn = `${name}${suffix}.png`;
        zip.file(`${dir}/${fn}`, await toBlob(resizeTo(surface, Math.round(base * s))));
        images.push({ idiom: "universal", filename: fn, scale: `${s}x` });
      }
      zip.file(`${dir}/Contents.json`, JSON.stringify({ images, info: { version: 1, author: "icon-generator" } }, null, 2));
    }
    if (presets.web) {
      for (const [suffix, s] of WEB) {
        const c = resizeTo(surface, Math.round(base * s));
        zip.file(`web/${name}${suffix}.png`, await toBlob(c));
        if (webp) zip.file(`web/${name}${suffix}.webp`, await toBlob(c, "image/webp"));
      }
    }
    opts.onProgress?.(i + 1, glyphs.length);
  }
  const counts = log.reduce<Record<Source, number>>(
    (acc, line) => {
      acc[line.split("\t")[1] as Source]++;
      return acc;
    },
    { resmi: 0, generate: 0 },
  );
  zip.file(
    "README.txt",
    [
      `Icon ${brand.name} (${brand.slug})`,
      `Dibuat: ${new Date().toLocaleString("id-ID")}`,
      `Ukuran dasar Android/iOS/Web: ${base}`,
      `${glyphs.length} glyph: ${counts.resmi} icon resmi, ${counts.generate} hasil generate`,
      brand.custom ? `Gaya referensi: ${brand.styleRef}` : "",
      "",
      "glyph\tsumber\tnama",
      ...log,
    ].join("\n"),
  );
  return zip.generateAsync({ type: "blob" });
}
