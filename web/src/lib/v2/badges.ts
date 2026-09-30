/**
 * Badges replace one-off drawings such as "PDF gratis" or "Tryout PPPK 2026": a small mark in the
 * top-right corner of any icon (v1 or v2), in the brand's accent with a light ring.
 */

export type BadgeKind = "gratis" | "baru" | "premium" | "selesai" | "teks";

export interface Badge {
  kind: BadgeKind;
  /** For kind "teks": up to 5 characters. */
  text?: string;
}

export const BADGE_OPTIONS: { kind: BadgeKind | "none"; label: string }[] = [
  { kind: "none", label: "Tanpa" },
  { kind: "gratis", label: "Gratis" },
  { kind: "baru", label: "Baru" },
  { kind: "premium", label: "Premium" },
  { kind: "selesai", label: "Selesai" },
  { kind: "teks", label: "Teks" },
];

export const BADGE_TEXT_MAX = 5;

const RING = `fill="{A}" stroke="{L}" stroke-width="4"`;

const STAR = (() => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 10 : 4.4;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(76 + r * Math.cos(a)).toFixed(2)},${(20 + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
})();

const SYMBOLS: Record<Exclude<BadgeKind, "teks">, string> = {
  gratis:
    `<rect x="68" y="19" width="16" height="10" rx="1.5" fill="{OA}"/><rect x="67" y="14.5" width="18" height="5" rx="1.5" fill="{OA}"/>` +
    `<rect x="75" y="14.5" width="2" height="14.5" fill="{A}"/>` +
    `<path d="M76 14.5 C73 9 68.5 11 71.5 14.5 M76 14.5 C79 9 83.5 11 80.5 14.5" fill="none" stroke="{OA}" stroke-width="2.2" stroke-linecap="round"/>`,
  baru: `<polygon points="${STAR}" fill="{OA}" stroke="{OA}" stroke-width="1" stroke-linejoin="round"/>`,
  premium: `<path d="M66.5 26 L68 14.5 L72.8 19.5 L76 12.5 L79.2 19.5 L84 14.5 L85.5 26 Z" fill="{OA}" stroke="{OA}" stroke-width="1.2" stroke-linejoin="round"/>`,
  selesai: `<path d="M68.5 20.5 L73.8 25.8 L83.5 15" fill="none" stroke="{OA}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function escape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Badge markup in the 96 grid, with token placeholders. */
export function badgeMarkup(badge: Badge | null | undefined): string {
  if (!badge) return "";
  if (badge.kind !== "teks") {
    return `<circle cx="76" cy="20" r="17" ${RING}/>${SYMBOLS[badge.kind]}`;
  }
  const text = (badge.text ?? "").trim().slice(0, BADGE_TEXT_MAX).toUpperCase();
  if (!text) return "";
  const w = Math.max(30, text.length * 10.2 + 14);
  const x = 88 - w;
  return (
    `<rect x="${x.toFixed(1)}" y="6" width="${w.toFixed(1)}" height="27" rx="13.5" ${RING.replace('stroke-width="4"', 'stroke-width="3.5"')}/>` +
    `<text x="${(x + w / 2).toFixed(1)}" y="25" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="16" fill="{OA}">${escape(text)}</text>`
  );
}

export function badgeKey(badge: Badge | null | undefined): string {
  if (!badge) return "";
  return badge.kind === "teks" ? `teks-${(badge.text ?? "").trim().slice(0, BADGE_TEXT_MAX).toLowerCase()}` : badge.kind;
}

/** Suffix for file names, e.g. jadipcpm_tryout_2026_512.png. */
export function badgeFileSuffix(badge: Badge | null | undefined): string {
  const k = badgeKey(badge).replace(/^teks-/, "").replace(/[^a-z0-9]+/g, "");
  return k ? `_${k}` : "";
}
