import JSZip from "jszip";
import { makeCanvas, toBlob } from "../render";
import { svgImage } from "../v2/svg";
import {
  appIconSvg,
  faviconSvg,
  iconBackground,
  lockupSvg,
  markSvg,
  wordmarkSvg,
  type IconOpts,
  type IconStyle,
  type Kit,
  type SvgOut,
} from "./compose";
import type { Layout, LogoSpec, Scheme } from "./types";

/** Rasterizes an SVG document (its width/height must already be the pixel size). */
export async function svgToPng(svg: string, w: number, h: number): Promise<Blob> {
  const img = await svgImage(svg);
  const c = makeCanvas(Math.round(w), Math.round(h));
  const x = c.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!x) throw new Error("Canvas 2D tidak tersedia di browser ini");
  x.drawImage(img, 0, 0, c.width, c.height);
  return toBlob(c);
}

/** Renders an SvgOut at a given height. */
export async function pngAtHeight(make: (h: number) => SvgOut, h: number): Promise<Blob> {
  const o = make(h);
  return svgToPng(o.svg, h * o.ratio, h);
}

/** Windows/browser .ico holding PNG images (supported since Windows Vista and by every browser). */
export async function icoFromPngs(images: { size: number; blob: Blob }[]): Promise<Blob> {
  const datas = await Promise.all(images.map((i) => i.blob.arrayBuffer()));
  const head = 6 + 16 * images.length;
  const total = head + datas.reduce((s, d) => s + d.byteLength, 0);
  const buf = new ArrayBuffer(total);
  const v = new DataView(buf);
  v.setUint16(0, 0, true);
  v.setUint16(2, 1, true);
  v.setUint16(4, images.length, true);
  let offset = head;
  images.forEach((img, i) => {
    const o = 6 + i * 16;
    const s = img.size >= 256 ? 0 : img.size;
    v.setUint8(o, s);
    v.setUint8(o + 1, s);
    v.setUint16(o + 4, 1, true);
    v.setUint16(o + 6, 32, true);
    v.setUint32(o + 8, datas[i].byteLength, true);
    v.setUint32(o + 12, offset, true);
    new Uint8Array(buf, offset, datas[i].byteLength).set(new Uint8Array(datas[i]));
    offset += datas[i].byteLength;
  });
  return new Blob([buf], { type: "image/x-icon" });
}

const SCHEMES: [Scheme, string][] = [
  ["warna", ""],
  ["gelap", "_gelap"],
  ["hitam", "_hitam"],
  ["putih", "_putih"],
];

/** Android launcher densities: legacy icon size (48 dp) and adaptive layer size (108 dp). */
const DENSITIES: [string, number][] = [
  ["mdpi", 1],
  ["hdpi", 1.5],
  ["xhdpi", 2],
  ["xxhdpi", 3],
  ["xxxhdpi", 4],
];

export interface PackOpts {
  iconStyle: IconStyle;
  onProgress?: (done: number, total: number) => void;
}

/**
 * Everything an app needs: SVG masters in four color schemes, PNGs, iOS/Android/web app icons,
 * the favicon set, and the spec to redraw the logo later.
 */
export async function buildLogoPack(spec: LogoSpec, kit: Kit, opts: PackOpts): Promise<Blob> {
  const zip = new JSZip();
  const slug = spec.id;
  const root = zip.folder(slug)!;
  const jobs: (() => Promise<void>)[] = [];
  const addPng = (path: string, make: () => Promise<Blob>) => jobs.push(async () => void root.file(path, await make()));

  // SVG masters
  for (const [scheme, suf] of SCHEMES) {
    root.file(`svg/${slug}_logo${suf}.svg`, markSvg(spec, kit, scheme).svg);
    root.file(`svg/${slug}_logo-teks${suf}.svg`, lockupSvg(spec, kit, scheme, "susun").svg);
    root.file(`svg/${slug}_logo-teks-baris${suf}.svg`, lockupSvg(spec, kit, scheme, "baris").svg);
  }
  for (const [scheme, suf] of SCHEMES.slice(0, 2)) {
    root.file(`svg/${slug}_teks${suf}.svg`, wordmarkSvg(spec, kit, scheme, "susun").svg);
    root.file(`svg/${slug}_teks-baris${suf}.svg`, wordmarkSvg(spec, kit, scheme, "baris").svg);
  }
  root.file(`svg/${slug}_logo-kecil.svg`, markSvg(spec, kit, "warna", { small: true }).svg);

  // PNG
  for (const [scheme, suf] of SCHEMES.slice(0, 2)) {
    for (const px of [256, 512, 1024]) {
      addPng(`png/${slug}_logo${suf}_${px}.png`, () => pngAtHeight((h) => markSvg(spec, kit, scheme, { px: h }), px));
    }
    for (const layout of ["susun", "baris"] as Layout[]) {
      const name = layout === "susun" ? "logo-teks" : "logo-teks-baris";
      for (const h of [128, 256, 512]) {
        addPng(`png/${slug}_${name}${suf}_h${h}.png`, () => pngAtHeight((hh) => lockupSvg(spec, kit, scheme, layout, hh), h));
      }
    }
  }

  // App icons
  const icon = (o: Omit<IconOpts, "style">, px: number) => () =>
    pngAtHeight((h) => appIconSvg(spec, kit, { ...o, style: opts.iconStyle, px: h }), px);
  addPng("app-icon/ios/AppIcon-1024.png", icon({ shape: "persegi", safe: 0.8 }, 1024));
  addPng("app-icon/android/playstore-512.png", icon({ shape: "persegi", safe: 0.8 }, 512));
  for (const [d, s] of DENSITIES) {
    addPng(`app-icon/android/mipmap-${d}/ic_launcher.png`, icon({ shape: "rounded", safe: 0.8 }, 48 * s));
    addPng(`app-icon/android/mipmap-${d}/ic_launcher_round.png`, icon({ shape: "lingkaran", safe: 0.76 }, 48 * s));
    addPng(`app-icon/android/mipmap-${d}/ic_launcher_foreground.png`, icon({ shape: "tanpa-latar", safe: 0.6 }, 108 * s));
    addPng(
      `app-icon/android/mipmap-${d}/ic_launcher_monochrome.png`,
      icon({ shape: "tanpa-latar", safe: 0.6, mono: true }, 108 * s),
    );
  }
  const adaptive =
    `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n` +
    `    <background android:drawable="@color/ic_launcher_background"/>\n` +
    `    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n` +
    `    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>\n</adaptive-icon>\n`;
  root.file("app-icon/android/mipmap-anydpi-v26/ic_launcher.xml", adaptive);
  root.file("app-icon/android/mipmap-anydpi-v26/ic_launcher_round.xml", adaptive);
  root.file(
    "app-icon/android/values/ic_launcher_background.xml",
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${iconBackground(spec, opts.iconStyle)}</color>\n</resources>\n`,
  );

  // Web
  root.file("app-icon/web/favicon.svg", faviconSvg(spec, kit));
  jobs.push(async () => {
    const small = (px: number) => pngAtHeight((h) => markSvg(spec, kit, "warna", { small: true, px: h }), px);
    const [a, b, c] = await Promise.all([small(16), small(32), small(48)]);
    root.file(
      "app-icon/web/favicon.ico",
      await icoFromPngs([
        { size: 16, blob: a },
        { size: 32, blob: b },
        { size: 48, blob: c },
      ]),
    );
  });
  addPng("app-icon/web/apple-touch-icon.png", icon({ shape: "persegi", safe: 0.8 }, 180));
  addPng("app-icon/web/icon-192.png", icon({ shape: "rounded", safe: 0.8 }, 192));
  addPng("app-icon/web/icon-512.png", icon({ shape: "rounded", safe: 0.8 }, 512));
  addPng("app-icon/web/icon-maskable-512.png", icon({ shape: "persegi", safe: 0.62 }, 512));
  root.file(
    "app-icon/web/manifest-icons.json",
    JSON.stringify(
      {
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        theme_color: spec.dark,
        background_color: iconBackground(spec, opts.iconStyle),
      },
      null,
      2,
    ),
  );
  root.file(
    "app-icon/web/head.html",
    [
      `<link rel="icon" href="/favicon.ico" sizes="48x48">`,
      `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
      `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
      `<meta name="theme-color" content="${spec.dark}">`,
    ].join("\n") + "\n",
  );

  root.file("logo.json", JSON.stringify({ ...spec, builtin: undefined }, null, 2));
  root.file("README.txt", readme(spec, opts.iconStyle, kit));

  let done = 0;
  opts.onProgress?.(0, jobs.length);
  const queue = [...jobs];
  const worker = async () => {
    for (let job = queue.shift(); job; job = queue.shift()) {
      await job();
      opts.onProgress?.(++done, jobs.length);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return zip.generateAsync({ type: "blob" });
}

function readme(spec: LogoSpec, style: IconStyle, kit: Kit): string {
  return [
    `${spec.family} ${spec.name}`.trim(),
    "=".repeat(40),
    `Warna gelap  : ${spec.dark}   (kotak, kata "${spec.family}")`,
    `Warna terang : ${spec.bright}   (panel, piktogram, nama aplikasi)`,
    `Font         : ${kit.font.label} (sudah diubah jadi outline di semua SVG)`,
    `Ikon aplikasi: latar ${style}`,
    "",
    "svg/",
    "  *_logo            logo saja (kotak)",
    "  *_logo-teks       logo + teks dua baris (utama)",
    "  *_logo-teks-baris logo + teks satu baris (untuk header yang pendek)",
    "  *_teks            teks saja",
    "  *_logo-kecil      versi kecil untuk 32 px ke bawah",
    "  Akhiran: _gelap untuk latar gelap, _hitam dan _putih untuk satu warna.",
    "png/                ukuran siap pakai (h = tinggi dalam piksel)",
    "app-icon/ios        AppIcon-1024.png (iOS memotong sudutnya sendiri)",
    "app-icon/android    mipmap-* dan adaptive icon (res/), ikon Play Store 512",
    "app-icon/web        favicon.ico, favicon.svg (ikut mode gelap), ikon PWA, head.html",
    "",
    "Buka logo.json di menu Logo app > Keluarga logo > Impor untuk mengedit logo ini lagi.",
    "",
    "Piktogram Lucide: ISC License. Font Gabarito: SIL Open Font License 1.1.",
  ].join("\n");
}
