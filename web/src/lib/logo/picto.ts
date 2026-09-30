import Fuse from "fuse.js";
import { luminance } from "../color";
import { dataUrl } from "../data";
import type { LogoSpec, PictoRef } from "./types";

/**
 * Pictograms are drawn on a 24-unit grid (like Lucide) with two color tokens: {B} for the main
 * (bright) color and {D} for details in the dark color. geometry.ts maps the grid onto the panel.
 */

export interface PictoEntry {
  kind: "bawaan" | "lucide";
  id: string;
  label: string;
  tags: string[];
}

interface Builtin extends PictoEntry {
  kind: "bawaan";
  draw: (w: number) => string;
}

const sw = (base: number, w: number) => (base * w).toFixed(2);

/** Redrawn from the four existing logos. */
export const BUILTIN_PICTOS: Builtin[] = [
  {
    kind: "bawaan",
    id: "laptop-kursor",
    label: "Laptop dan kursor (Freelance)",
    tags: ["freelance", "laptop", "kerja", "remote", "komputer", "kursor", "proyek"],
    draw: (w) =>
      `<rect x="3.2" y="3.4" width="17.6" height="12.8" rx="1.6" fill="none" stroke="{B}" stroke-width="${sw(2.6, w)}"/>` +
      `<path d="M1.4 20.4H22.6" fill="none" stroke="{B}" stroke-width="${sw(3, w)}" stroke-linecap="round"/>` +
      `<path d="M9.3 6.9L16.7 10.5L13.6 11.5L15.7 14.7L14 15.8L11.9 12.6L9.8 15Z" fill="{B}" stroke="{B}" stroke-width="${sw(1, w)}" stroke-linejoin="round"/>`,
  },
  {
    kind: "bawaan",
    id: "buku-terbuka",
    label: "Buku terbuka (Knowledge)",
    tags: ["knowledge", "pengetahuan", "buku", "belajar", "wiki", "dokumentasi", "panduan"],
    draw: () =>
      `<path d="M11 5.4C8.4 3.5 5 3 1.6 3.5V19.9C5 19.4 8.4 19.9 11 21.8Z" fill="{B}"/>` +
      `<path d="M13 5.4C15.6 3.5 19 3 22.4 3.5V19.9C19 19.4 15.6 19.9 13 21.8Z" fill="{B}"/>`,
  },
  {
    kind: "bawaan",
    id: "kalender",
    label: "Kalender (Momentum)",
    tags: ["momentum", "kalender", "jadwal", "agenda", "event", "tanggal", "rilis"],
    draw: (w) =>
      `<rect x="2.6" y="4.6" width="18.8" height="17.4" rx="2.4" fill="none" stroke="{B}" stroke-width="${sw(2.4, w)}"/>` +
      `<path d="M2.6 9.8H21.4" fill="none" stroke="{B}" stroke-width="${sw(2.4, w)}"/>` +
      `<path d="M7.6 2.2V6.8M16.4 2.2V6.8" fill="none" stroke="{B}" stroke-width="${sw(2.6, w)}" stroke-linecap="round"/>` +
      [12.3, 16.8]
        .flatMap((y) => [6.2, 13.2].map((x) => `<rect x="${x}" y="${y}" width="4.6" height="3.2" rx="0.8" fill="{B}"/>`))
        .join(""),
  },
  {
    kind: "bawaan",
    id: "daftar-cek",
    label: "Daftar dan centang (Track)",
    tags: ["track", "lacak", "tugas", "checklist", "progres", "status", "selesai"],
    draw: (w) =>
      `<path d="M3.6 4.8H18.6M3.6 10.4H14.2" fill="none" stroke="{D}" stroke-width="${sw(3, w)}" stroke-linecap="round"/>` +
      `<path d="M4.6 16.6L8.9 20.8L20.2 9.6" fill="none" stroke="{B}" stroke-width="${sw(3.2, w)}" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
];

const BUILTIN_BY_ID = new Map(BUILTIN_PICTOS.map((p) => [p.id, p]));

/** Lucide strokes are 2 units; the product logos use heavier lines. */
const LUCIDE_STROKE = 2.4;

export interface LucideSet {
  entries: PictoEntry[];
  markup: Map<string, string>;
  fuse: Fuse<PictoEntry>;
}

let lucidePromise: Promise<LucideSet> | null = null;

export function loadLucide(): Promise<LucideSet> {
  lucidePromise ??= fetch(dataUrl("logo/lucide.json"))
    .then((r) => {
      if (!r.ok) throw new Error("Pustaka piktogram belum diekspor (python pipeline/logo/export_logo_data.py)");
      return r.json() as Promise<[string, string, string[]][]>;
    })
    .then((rows) => {
      const entries: PictoEntry[] = [
        ...BUILTIN_PICTOS.map(({ kind, id, label, tags }) => ({ kind, id, label, tags })),
        ...rows.map(([id, , tags]) => ({ kind: "lucide" as const, id, label: id.replace(/-/g, " "), tags })),
      ];
      const fuse = new Fuse(entries, {
        keys: [
          { name: "id", weight: 3 },
          { name: "label", weight: 2 },
          { name: "tags", weight: 1.5 },
        ],
        threshold: 0.3,
        ignoreLocation: true,
        minMatchCharLength: 2,
      });
      return { entries, markup: new Map(rows.map(([id, m]) => [id, m])), fuse };
    });
  lucidePromise.catch(() => (lucidePromise = null));
  return lucidePromise;
}

/** Pictogram markup on the 24 grid with {B}/{D} tokens; w scales stroke widths. */
export function pictoMarkup(ref: PictoRef, lucide: LucideSet | null, w = 1): string {
  if (ref.kind === "bawaan") return (BUILTIN_BY_ID.get(ref.id) ?? BUILTIN_PICTOS[0]).draw(w);
  if (ref.kind === "custom") return ref.svg;
  const m = lucide?.markup.get(ref.id);
  if (!m) return "";
  return (
    `<g fill="none" stroke="{B}" stroke-width="${sw(LUCIDE_STROKE, w)}" stroke-linecap="round" stroke-linejoin="round">` +
    m.replace(/currentColor/g, "{B}") +
    `</g>`
  );
}

/** The pictogram alone, flat, for picker tiles. */
export function flatPictoSvg(ref: PictoRef, lucide: LucideSet | null, bright: string, dark: string, px = 40): string {
  const m = pictoMarkup(ref, lucide, 1).replace(/\{B\}/g, bright).replace(/\{D\}/g, dark);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}">${m}</svg>`;
}

/** Lucide pictograms offered before the user searches. */
export const POPULAR: string[] = [
  "chart-line",
  "chart-pie",
  "target",
  "lightbulb",
  "rocket",
  "users",
  "message-circle",
  "bell",
  "shield-check",
  "wallet",
  "package",
  "truck",
  "map-pin",
  "graduation-cap",
  "presentation",
  "headset",
  "clipboard-list",
  "folder-kanban",
  "database",
  "code-xml",
  "bot",
  "sparkles",
  "trophy",
  "megaphone",
];

export function pictoLabel(ref: PictoRef): string {
  if (ref.kind === "bawaan") return BUILTIN_BY_ID.get(ref.id)?.label ?? ref.id;
  if (ref.kind === "custom") return ref.name ?? "SVG sendiri";
  return ref.id.replace(/-/g, " ");
}

export function sameRef(a: PictoRef, b: PictoRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "custom" && b.kind === "custom") return a.svg === b.svg;
  return (a as { id: string }).id === (b as { id: string }).id;
}

/* ---------- suggestions ---------- */

/** Indonesian (and common English) app words -> pictograms. Checked against Lucide by the export script. */
const KEYWORDS: Record<string, string[]> = {
  freelance: ["laptop-kursor", "laptop", "briefcase"],
  freelancer: ["laptop-kursor", "laptop", "briefcase"],
  lepas: ["laptop-kursor", "laptop"],
  remote: ["laptop-kursor", "laptop", "house"],
  knowledge: ["buku-terbuka", "book-open", "library", "lightbulb"],
  pengetahuan: ["buku-terbuka", "book-open", "library", "lightbulb"],
  wiki: ["buku-terbuka", "book-open", "library"],
  dokumentasi: ["buku-terbuka", "book-text", "file-text"],
  belajar: ["buku-terbuka", "graduation-cap", "book-open"],
  momentum: ["kalender", "trending-up", "rocket", "zap"],
  jadwal: ["kalender", "calendar-days", "calendar-clock"],
  kalender: ["kalender", "calendar-days"],
  agenda: ["kalender", "calendar-days", "notebook-pen"],
  event: ["kalender", "calendar-heart", "party-popper", "ticket"],
  acara: ["kalender", "party-popper", "ticket"],
  rilis: ["rocket", "kalender", "package"],
  release: ["rocket", "package"],
  track: ["daftar-cek", "list-checks", "route", "activity"],
  tracking: ["daftar-cek", "list-checks", "route"],
  lacak: ["daftar-cek", "route", "map-pin"],
  tugas: ["daftar-cek", "list-checks", "square-check-big", "clipboard-check"],
  task: ["daftar-cek", "list-checks", "square-check-big"],
  todo: ["daftar-cek", "list-todo", "list-checks"],
  progres: ["daftar-cek", "chart-line", "activity"],
  progress: ["daftar-cek", "chart-line", "activity"],
  laporan: ["file-chart-column", "chart-column", "clipboard-list"],
  report: ["file-chart-column", "chart-column"],
  analitik: ["chart-line", "chart-pie", "chart-column"],
  analisis: ["chart-line", "chart-pie", "search"],
  analytics: ["chart-line", "chart-pie", "chart-column"],
  data: ["database", "chart-column", "table"],
  dashboard: ["layout-dashboard", "gauge", "chart-pie"],
  metrik: ["gauge", "chart-line", "activity"],
  insight: ["lightbulb", "eye", "chart-line", "telescope"],
  wawasan: ["lightbulb", "eye", "telescope"],
  ide: ["lightbulb", "sparkles"],
  inovasi: ["lightbulb", "sparkles", "rocket"],
  target: ["target", "goal", "crosshair", "flag"],
  okr: ["target", "goal", "flag"],
  kpi: ["gauge", "target", "chart-line"],
  goal: ["target", "goal", "flag"],
  sasaran: ["target", "goal"],
  proyek: ["folder-kanban", "kanban", "briefcase"],
  project: ["folder-kanban", "kanban", "briefcase"],
  kanban: ["kanban", "folder-kanban"],
  sprint: ["kanban", "timer", "zap"],
  roadmap: ["map", "milestone", "route"],
  tim: ["users", "users-round", "contact"],
  team: ["users", "users-round"],
  karyawan: ["users", "id-card", "contact"],
  pegawai: ["users", "id-card"],
  sdm: ["users", "id-card", "contact"],
  hr: ["users", "id-card", "contact"],
  absen: ["fingerprint-pattern", "user-check", "clock"],
  absensi: ["fingerprint-pattern", "user-check", "clock"],
  kehadiran: ["fingerprint-pattern", "user-check"],
  cuti: ["plane", "tree-palm", "calendar-x"],
  izin: ["file-check", "stamp", "calendar-x"],
  rekrutmen: ["user-plus", "user-search", "briefcase"],
  rekrut: ["user-plus", "user-search"],
  hiring: ["user-plus", "user-search", "briefcase"],
  lowongan: ["briefcase", "user-plus"],
  gaji: ["wallet", "banknote", "coins"],
  payroll: ["wallet", "banknote"],
  keuangan: ["landmark", "wallet", "coins", "piggy-bank"],
  finance: ["landmark", "wallet", "coins"],
  anggaran: ["piggy-bank", "calculator", "wallet"],
  budget: ["piggy-bank", "calculator", "wallet"],
  pembayaran: ["credit-card", "wallet", "receipt"],
  payment: ["credit-card", "wallet"],
  tagihan: ["receipt", "file-text", "credit-card"],
  invoice: ["receipt", "file-text"],
  penjualan: ["shopping-cart", "trending-up", "store"],
  sales: ["shopping-cart", "trending-up", "handshake"],
  pelanggan: ["users", "heart-handshake", "contact"],
  customer: ["users", "heart-handshake", "contact"],
  crm: ["contact", "heart-handshake", "users"],
  klien: ["handshake", "contact", "users"],
  tiket: ["ticket", "life-buoy", "headset"],
  ticket: ["ticket", "life-buoy"],
  helpdesk: ["headset", "life-buoy", "ticket"],
  support: ["headset", "life-buoy", "message-circle"],
  bantuan: ["life-buoy", "headset", "circle-question-mark"],
  keluhan: ["message-circle-warning", "headset", "ticket"],
  chat: ["message-circle", "messages-square"],
  pesan: ["message-circle", "send", "mail"],
  komunikasi: ["messages-square", "message-circle", "radio"],
  notifikasi: ["bell", "bell-ring"],
  pengumuman: ["megaphone", "bell", "radio"],
  broadcast: ["radio", "megaphone"],
  survei: ["clipboard-list", "list-todo", "chart-pie"],
  survey: ["clipboard-list", "list-todo"],
  kuesioner: ["clipboard-list", "list-todo"],
  formulir: ["clipboard-list", "square-pen", "file-text"],
  form: ["clipboard-list", "square-pen"],
  kuis: ["circle-question-mark", "puzzle", "clipboard-check"],
  quiz: ["circle-question-mark", "puzzle"],
  ujian: ["clipboard-check", "graduation-cap", "file-check"],
  tes: ["clipboard-check", "test-tube", "circle-question-mark"],
  kelas: ["graduation-cap", "presentation", "school"],
  kursus: ["graduation-cap", "book-open", "presentation"],
  course: ["graduation-cap", "book-open", "presentation"],
  pelatihan: ["graduation-cap", "presentation", "dumbbell"],
  training: ["graduation-cap", "presentation", "dumbbell"],
  onboarding: ["compass", "map", "hand"],
  panduan: ["compass", "book-bookmark", "map"],
  video: ["video", "clapperboard", "circle-play"],
  konten: ["image", "pen-line", "layout-grid"],
  content: ["image", "pen-line", "layout-grid"],
  media: ["image", "film", "video"],
  desain: ["pen-tool", "palette", "brush"],
  design: ["pen-tool", "palette", "brush"],
  kreatif: ["palette", "sparkles", "brush"],
  kode: ["code", "code-xml", "terminal"],
  code: ["code", "code-xml", "terminal"],
  developer: ["code-xml", "terminal", "braces"],
  api: ["webhook", "braces", "plug"],
  deploy: ["rocket", "cloud-upload", "server"],
  server: ["server", "database", "cloud"],
  cloud: ["cloud", "cloud-upload"],
  bug: ["bug", "shield-check"],
  qa: ["bug", "badge-check", "test-tube"],
  testing: ["test-tube", "bug", "badge-check"],
  keamanan: ["shield", "shield-check", "lock"],
  security: ["shield", "shield-check", "lock"],
  akses: ["key-round", "lock", "shield-check"],
  login: ["key-round", "log-in", "lock"],
  pengaturan: ["settings", "sliders-horizontal", "wrench"],
  settings: ["settings", "sliders-horizontal"],
  admin: ["settings", "shield", "sliders-horizontal"],
  integrasi: ["plug", "workflow", "link"],
  integration: ["plug", "workflow", "link"],
  sinkron: ["refresh-cw", "arrow-left-right"],
  otomatisasi: ["bot", "workflow", "zap"],
  automation: ["bot", "workflow", "zap"],
  bot: ["bot", "message-circle"],
  ai: ["sparkles", "bot", "brain"],
  inventaris: ["package", "warehouse", "boxes"],
  inventory: ["package", "warehouse", "boxes"],
  stok: ["boxes", "package", "warehouse"],
  gudang: ["warehouse", "boxes"],
  aset: ["boxes", "package", "archive"],
  pengiriman: ["truck", "package-check", "map-pin"],
  logistik: ["truck", "warehouse", "route"],
  delivery: ["truck", "package-check"],
  lokasi: ["map-pin", "map", "navigation"],
  peta: ["map", "map-pin"],
  cabang: ["store", "map-pin", "building"],
  kantor: ["building", "briefcase"],
  kontrak: ["signature", "handshake", "scale"],
  legal: ["scale", "signature", "gavel"],
  hukum: ["scale", "gavel"],
  rapat: ["presentation", "users", "calendar-clock"],
  meeting: ["presentation", "users", "video"],
  presentasi: ["presentation", "monitor"],
  catatan: ["notebook-pen", "sticky-note", "notebook"],
  notes: ["notebook-pen", "sticky-note"],
  memo: ["sticky-note", "notebook-pen"],
  arsip: ["archive", "folder-open", "folder"],
  archive: ["archive", "folder-open"],
  berkas: ["folder", "files", "file-text"],
  dokumen: ["file-text", "files", "folder"],
  file: ["files", "folder", "file-text"],
  feedback: ["message-square-heart", "star", "thumbs-up"],
  ulasan: ["star", "message-square-heart"],
  review: ["star", "message-square-heart", "search-check"],
  rating: ["star", "thumbs-up"],
  promo: ["badge-percent", "tag", "megaphone"],
  diskon: ["badge-percent", "tag"],
  marketing: ["megaphone", "target", "chart-line"],
  kampanye: ["megaphone", "flag"],
  campaign: ["megaphone", "flag"],
  komunitas: ["users-round", "messages-square", "heart-handshake"],
  community: ["users-round", "messages-square"],
  forum: ["messages-square", "message-circle"],
  kesehatan: ["heart-pulse", "stethoscope"],
  health: ["heart-pulse", "stethoscope"],
  waktu: ["timer", "clock", "hourglass"],
  timer: ["timer", "hourglass"],
  durasi: ["hourglass", "timer"],
  pengadaan: ["shopping-bag", "receipt", "package"],
  procurement: ["shopping-bag", "receipt"],
  belanja: ["shopping-bag", "shopping-cart"],
  kualitas: ["badge-check", "shield-check", "award"],
  audit: ["search-check", "clipboard-check", "shield-check"],
  kinerja: ["gauge", "trophy", "chart-line"],
  performa: ["gauge", "trophy", "chart-line"],
  penilaian: ["star", "clipboard-check", "award"],
  reward: ["trophy", "gift", "award"],
  poin: ["coins", "star", "trophy"],
  hadiah: ["gift", "trophy"],
  aplikasi: ["smartphone", "app-window", "layout-grid"],
  app: ["smartphone", "app-window", "layout-grid"],
  mobile: ["smartphone", "tablet-smartphone"],
  web: ["globe", "monitor", "app-window"],
  website: ["globe", "monitor"],
  portal: ["globe", "layout-dashboard"],
  email: ["mail", "inbox", "send"],
  surat: ["mail", "file-text"],
  produk: ["package", "box", "layers"],
  katalog: ["layout-grid", "book-open", "package"],
  riset: ["flask-conical", "microscope", "search"],
  research: ["flask-conical", "microscope", "search"],
  eksperimen: ["flask-conical", "test-tube"],
  voting: ["vote", "list-checks"],
  polling: ["vote", "chart-pie"],
  persetujuan: ["stamp", "badge-check", "file-check"],
  approval: ["stamp", "badge-check", "file-check"],
  perpustakaan: ["library", "book-open"],
  pencarian: ["search", "scan-search"],
  search: ["search", "scan-search"],
};

function words(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/** Pictograms for an app name and description: keyword matches first, then Lucide tag search. */
export function suggestPictos(spec: Pick<LogoSpec, "name" | "desc">, lucide: LucideSet | null, limit = 8): PictoRef[] {
  const out: PictoRef[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (seen.has(id)) return;
    if (BUILTIN_BY_ID.has(id)) out.push({ kind: "bawaan", id });
    else if (lucide?.markup.has(id)) out.push({ kind: "lucide", id });
    else return;
    seen.add(id);
  };
  const ws = words(`${spec.name} ${spec.desc ?? ""}`);
  for (const w of ws) for (const id of KEYWORDS[w] ?? []) push(id);
  if (lucide) {
    for (const w of ws) {
      if (w.length < 3) continue;
      for (const r of lucide.fuse.search(w, { limit: 4 })) push(r.item.id);
    }
  }
  return out.slice(0, limit);
}

export function searchPictos(query: string, lucide: LucideSet | null, limit = 72): PictoRef[] {
  const q = query.trim();
  if (!q || !lucide) return [];
  const seen = new Set<string>();
  const out: PictoRef[] = [];
  const add = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    out.push(BUILTIN_BY_ID.has(id) ? { kind: "bawaan", id } : { kind: "lucide", id });
  };
  for (const w of words(q)) for (const id of KEYWORDS[w] ?? []) if (BUILTIN_BY_ID.has(id) || lucide.markup.has(id)) add(id);
  for (const r of lucide.fuse.search(q, { limit })) add(r.item.id);
  return out.slice(0, limit);
}

/* ---------- pasted SVG ---------- */

const TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);
const ATTRS = new Set([
  "d",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "width",
  "height",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "transform",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "fill-rule",
  "clip-rule",
  "opacity",
  "fill-opacity",
  "stroke-opacity",
]);
const PAINT = new Set(["fill", "stroke"]);
const STYLE_PROPS = new Set([...ATTRS].filter((a) => a.startsWith("fill") || a.startsWith("stroke") || a === "opacity"));

function esc(v: string): string {
  return v.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

function normColor(v: string): string {
  const s = v.trim().toLowerCase();
  if (s === "black") return "#000000";
  if (s === "white") return "#ffffff";
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return s;
}

export interface CustomPicto {
  svg: string;
  elements: number;
  colors: number;
}

/**
 * Cleans an SVG pasted by the user (from Claude, Figma, an icon site...) into pictogram markup:
 * only basic shapes survive, it is scaled into the 24 grid, and its colors become {B}/{D}:
 * currentColor is the main color and anything else the detail color; without currentColor the
 * darkest of several colors becomes the detail color.
 */
export function parseCustomSvg(text: string): CustomPicto {
  const src = text.match(/<svg[\s\S]*?<\/svg>/i)?.[0];
  if (!src) throw new Error("Tidak ada <svg>…</svg> di teks yang ditempel.");
  const doc = new DOMParser().parseFromString(src, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) {
    throw new Error("SVG tidak bisa dibaca. Pastikan kodenya lengkap.");
  }
  const vb = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  const w0 = parseFloat(root.getAttribute("width") ?? "") || 24;
  const h0 = parseFloat(root.getAttribute("height") ?? "") || 24;
  const [minX, minY, vw, vh] = vb.length === 4 && vb.every(Number.isFinite) ? vb : [0, 0, w0, h0];

  const paints = new Set<string>();
  let count = 0;

  const attrsOf = (el: Element): [string, string][] => {
    const out = new Map<string, string>();
    for (const a of Array.from(el.attributes)) if (ATTRS.has(a.name)) out.set(a.name, a.value);
    for (const decl of (el.getAttribute("style") ?? "").split(";")) {
      const [k, v] = decl.split(":").map((s) => s?.trim());
      if (k && v && STYLE_PROPS.has(k)) out.set(k, v);
    }
    for (const k of PAINT) {
      const v = out.get(k);
      if (v && v !== "none" && !v.startsWith("url(")) paints.add(v === "currentColor" ? v : normColor(v));
      if (v?.startsWith("url(")) out.set(k, "currentColor");
    }
    return [...out];
  };

  const walk = (el: Element): string => {
    const tag = el.nodeName.toLowerCase();
    if (!TAGS.has(tag)) return "";
    count += tag === "g" ? 0 : 1;
    const inner = Array.from(el.children).map(walk).join("");
    const attrs = attrsOf(el)
      .map(([k, v]) => ` ${k}="${esc(v)}"`)
      .join("");
    return tag === "g" ? `<g${attrs}>${inner}</g>` : `<${tag}${attrs}/>`;
  };

  const body = Array.from(root.children).map(walk).join("");
  if (!count) throw new Error("SVG tidak berisi bentuk yang bisa dipakai (path, circle, rect, line…).");
  const rootAttrs = attrsOf(root);
  const hasRootPaint = rootAttrs.some(([k]) => PAINT.has(k));
  // SVG's default fill is black: an element without fill still paints, so count it as the main color
  if (!hasRootPaint && !paints.size) paints.add("currentColor");

  const real = [...paints].filter((p) => p !== "currentColor");
  const detail = new Set<string>();
  if (paints.has("currentColor")) real.forEach((p) => detail.add(p));
  else if (real.length > 1) {
    const darkest = real.reduce((a, b) => (safeLum(a) <= safeLum(b) ? a : b));
    detail.add(darkest);
  }
  const token = (v: string) => {
    if (v === "none") return v;
    const c = v === "currentColor" ? v : normColor(v);
    return detail.has(c) ? "{D}" : "{B}";
  };

  const scale = 24 / Math.max(vw, vh);
  const tx = (24 - vw * scale) / 2 - minX * scale;
  const ty = (24 - vh * scale) / 2 - minY * scale;
  const rootGroupAttrs = rootAttrs
    .filter(([k]) => k !== "width" && k !== "height" && k !== "x" && k !== "y")
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  const fillDefault = rootAttrs.some(([k]) => k === "fill") ? "" : ` fill="currentColor"`;
  let svg =
    `<g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${scale.toFixed(5)})"${fillDefault}${rootGroupAttrs}>` +
    body +
    `</g>`;
  svg = svg.replace(/ (fill|stroke)="([^"]*)"/g, (_, k: string, v: string) => ` ${k}="${token(v)}"`);
  return { svg, elements: count, colors: paints.size };
}

function safeLum(c: string): number {
  try {
    return luminance(c);
  } catch {
    return 1;
  }
}

/** Brief to paste into Claude for a custom pictogram that fits the family. */
export function claudeBrief(spec: Pick<LogoSpec, "family" | "name" | "desc">): string {
  const app = `${spec.family} ${spec.name}`.trim();
  return [
    `Tolong buatkan piktogram SVG untuk logo aplikasi internal "${app}".`,
    `Fungsi aplikasinya: ${spec.desc?.trim() || "(tulis fungsi aplikasinya di sini)"}.`,
    "",
    "Aturan:",
    '- viewBox="0 0 24 24", tanpa width/height, tanpa teks dan tanpa gambar.',
    '- Gaya garis seperti ikon Lucide: fill="none", stroke="currentColor", stroke-width="2", stroke-linecap="round", stroke-linejoin="round".',
    '- Boleh 1–2 bentuk isi (fill="currentColor") untuk aksen kecil.',
    '- Bagian yang perlu warna kedua (lebih gelap) diberi warna "#000000".',
    "- Semua bentuk di dalam area 2–22, maksimal 8 elemen, dan tetap terbaca di ukuran 32 px.",
    "- Tanpa bingkai atau kotak luar: piktogram ini ditempel di panel depan kotak isometrik.",
    "",
    "Beri 3 konsep berbeda, masing-masing dalam blok kode <svg> terpisah, dan satu kalimat alasan untuk tiap konsep.",
  ].join("\n");
}
