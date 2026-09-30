import type Fuse from "fuse.js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadCustomBrands, saveCustomBrands } from "./lib/brands";
import { loadAll } from "./lib/data";
import { makeFuse } from "./lib/search";
import type { Brand, Catalog, Glyph, RolesData, Version } from "./lib/types";
import { badgeKey, type Badge } from "./lib/v2/badges";

export interface TrayItem {
  id: string;
  badge?: Badge | null;
}

interface AppData {
  catalog: Catalog;
  roles: RolesData;
  builtin: Brand[];
  custom: Brand[];
  brands: Brand[];
  glyphs: Glyph[];
  glyphById: Map<string, Glyph>;
  brandBySlug: Map<string, Brand>;
  fuse: Fuse<Glyph>;
  saveCustom: (b: Brand) => Brand;
  removeCustom: (slug: string) => void;
  /** The brand every screen works with (persisted). */
  brand: Brand;
  setBrand: (slug: string) => void;
  version: Version;
  setVersion: (v: Version) => void;
  /** Icons collected for one download. */
  tray: TrayItem[];
  toggleTray: (item: TrayItem) => void;
  inTray: (id: string) => boolean;
  clearTray: () => void;
  recent: string[];
  pushRecent: (id: string) => void;
}

const Ctx = createContext<AppData | null>(null);

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
    /* storage unavailable: preferences last for this visit only */
  }
}

const K = {
  prefs: "icon-generator.prefs.v1",
  tray: "icon-generator.tray.v1",
  recent: "icon-generator.recent.v1",
};

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<{ catalog: Catalog; roles: RolesData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState<Brand[]>(() => loadCustomBrands());
  const [prefs, setPrefs] = useState<{ brand: string; version: Version }>(() =>
    read(K.prefs, { brand: "jadipcpm", version: "v2" as Version }),
  );
  const [tray, setTray] = useState<TrayItem[]>(() => read(K.tray, []));
  const [recent, setRecent] = useState<string[]>(() => read(K.recent, []));

  useEffect(() => {
    loadAll()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => write(K.prefs, prefs), [prefs]);
  useEffect(() => write(K.tray, tray), [tray]);
  useEffect(() => write(K.recent, recent), [recent]);

  const saveCustom = useCallback(
    (b: Brand): Brand => {
      const taken = new Set(data?.catalog.brands.map((x) => x.slug));
      const stored = taken.has(b.slug) ? { ...b, slug: `${b.slug}_baru` } : b;
      setCustom((prev) => {
        const next = [...prev.filter((x) => x.slug !== stored.slug), stored];
        saveCustomBrands(next);
        return next;
      });
      return stored;
    },
    [data],
  );

  const removeCustom = useCallback((slug: string) => {
    setCustom((prev) => {
      const next = prev.filter((x) => x.slug !== slug);
      saveCustomBrands(next);
      return next;
    });
  }, []);

  const setBrand = useCallback((slug: string) => setPrefs((p) => ({ ...p, brand: slug })), []);
  const setVersion = useCallback((version: Version) => setPrefs((p) => ({ ...p, version })), []);
  const toggleTray = useCallback(
    (item: TrayItem) =>
      setTray((prev) => {
        const same = prev.find((x) => x.id === item.id);
        if (same && badgeKey(same.badge) === badgeKey(item.badge)) return prev.filter((x) => x.id !== item.id);
        return [...prev.filter((x) => x.id !== item.id), item];
      }),
    [],
  );
  const clearTray = useCallback(() => setTray([]), []);
  const pushRecent = useCallback(
    (id: string) => setRecent((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 12)),
    [],
  );

  const value = useMemo<AppData | null>(() => {
    if (!data) return null;
    const builtin = data.catalog.brands;
    const brands = [...builtin, ...custom];
    const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
    const trayIds = new Set(tray.map((t) => t.id));
    return {
      catalog: data.catalog,
      roles: data.roles,
      builtin,
      custom,
      brands,
      glyphs: data.catalog.glyphs,
      glyphById: new Map(data.catalog.glyphs.map((g) => [g.id, g])),
      brandBySlug,
      fuse: makeFuse(data.catalog.glyphs),
      saveCustom,
      removeCustom,
      brand: brandBySlug.get(prefs.brand) ?? builtin.find((b) => b.slug === "jadipcpm") ?? builtin[0],
      setBrand,
      version: prefs.version,
      setVersion,
      tray,
      toggleTray,
      inTray: (id: string) => trayIds.has(id),
      clearTray,
      recent,
      pushRecent,
    };
  }, [data, custom, prefs, tray, recent, saveCustom, removeCustom, setBrand, setVersion, toggleTray, clearTray, pushRecent]);

  if (error) {
    return (
      <div className="fullscreen">
        <h1>Data belum siap</h1>
        <p>{error}</p>
      </div>
    );
  }
  if (!value) {
    return (
      <div className="fullscreen">
        <div className="spinner" aria-hidden />
        <p>Memuat katalog icon…</p>
      </div>
    );
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}
