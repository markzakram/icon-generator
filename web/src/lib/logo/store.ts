import { useSyncExternalStore } from "react";
import type { LogoSpec } from "./types";

/** The four product apps that already have a logo, rebuilt with the generator (colors measured from their files). */
export const BUILTIN_LOGOS: LogoSpec[] = [
  {
    id: "product_freelance",
    family: "Product",
    name: "Freelance",
    dark: "#3E01C9",
    bright: "#9437FB",
    picto: { kind: "bawaan", id: "laptop-kursor" },
    builtin: true,
  },
  {
    id: "product_knowledge",
    family: "Product",
    name: "Knowledge",
    dark: "#035F34",
    bright: "#01BC50",
    picto: { kind: "bawaan", id: "buku-terbuka" },
    builtin: true,
  },
  {
    id: "product_momentum",
    family: "Product",
    name: "Momentum",
    dark: "#8F011E",
    bright: "#F90220",
    picto: { kind: "bawaan", id: "kalender" },
    builtin: true,
  },
  {
    id: "product_track",
    family: "Product",
    name: "Track",
    dark: "#012E70",
    bright: "#00AFEC",
    picto: { kind: "bawaan", id: "daftar-cek" },
    builtin: true,
  },
];

/** Original PNGs of the built-in logos (for comparison), keyed by id. */
export const ORIGINAL_ART: Record<string, { mark: string; lockup: string }> = Object.fromEntries(
  BUILTIN_LOGOS.map((l) => {
    const slug = l.id.replace("product_", "");
    return [l.id, { mark: `logo/asli/${slug}_mark.png`, lockup: `logo/asli/${slug}_lockup.png` }];
  }),
);

const KEY = "logo-generator.family.v1";
const DRAFT_KEY = "logo-generator.draft.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the family lasts for this visit only */
  }
}

let saved: LogoSpec[] = read<LogoSpec[]>(KEY, []);
let snapshot: LogoSpec[] = [...BUILTIN_LOGOS, ...saved];
const listeners = new Set<() => void>();

function commit(next: LogoSpec[]): void {
  saved = next;
  snapshot = [...BUILTIN_LOGOS, ...saved];
  write(KEY, saved);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Built-in logos first, then the ones made here. */
export function useFamily(): LogoSpec[] {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function slugify(family: string, name: string): string {
  return (
    `${family} ${name}`
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "logo"
  );
}

/** Saves (or replaces) a logo; returns the id it was stored under. Built-in ids get a suffix. */
export function saveLogo(spec: LogoSpec): string {
  const builtinIds = new Set(BUILTIN_LOGOS.map((b) => b.id));
  let id = spec.id || slugify(spec.family, spec.name);
  if (builtinIds.has(id)) id = `${id}_baru`;
  const stored: LogoSpec = { ...spec, id, builtin: undefined, updated: Date.now() };
  commit([...saved.filter((s) => s.id !== id), stored]);
  return id;
}

export function removeLogo(id: string): void {
  commit(saved.filter((s) => s.id !== id));
}

export function isSaved(id: string): boolean {
  return saved.some((s) => s.id === id);
}

function valid(x: unknown): x is LogoSpec {
  const s = x as LogoSpec;
  return (
    !!s &&
    typeof s.name === "string" &&
    typeof s.family === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(s.dark) &&
    /^#[0-9A-Fa-f]{6}$/.test(s.bright) &&
    !!s.picto &&
    typeof s.picto.kind === "string"
  );
}

/** Adds logos from an exported family file; returns how many were imported. */
export function importFamily(json: string): number {
  const data = JSON.parse(json) as unknown;
  const list = (Array.isArray(data) ? data : [data]).filter(valid);
  if (!list.length) throw new Error("File ini tidak berisi logo yang valid.");
  const byId = new Map(saved.map((s) => [s.id, s]));
  for (const s of list) {
    if (s.builtin) continue;
    const id = s.id || slugify(s.family, s.name);
    byId.set(id, { ...s, id, builtin: undefined });
  }
  commit([...byId.values()]);
  return list.filter((s) => !s.builtin).length;
}

export function exportFamily(): string {
  return JSON.stringify(saved, null, 2);
}

export function loadDraft(): LogoSpec | null {
  const d = read<LogoSpec | null>(DRAFT_KEY, null);
  return d && valid(d) ? d : null;
}

export function saveDraft(spec: LogoSpec): void {
  write(DRAFT_KEY, spec);
}
