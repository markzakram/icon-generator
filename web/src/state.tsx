import type Fuse from "fuse.js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadCustomBrands, saveCustomBrands } from "./lib/brands";
import { loadAll } from "./lib/data";
import { makeFuse } from "./lib/search";
import type { Brand, Catalog, Glyph, RolesData } from "./lib/types";

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
  /** Stores a custom brand (slug made unique) and returns it as stored. */
  saveCustom: (b: Brand) => Brand;
  removeCustom: (slug: string) => void;
}

const Ctx = createContext<AppData | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<{ catalog: Catalog; roles: RolesData } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState<Brand[]>(() => loadCustomBrands());

  useEffect(() => {
    loadAll()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

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

  const value = useMemo<AppData | null>(() => {
    if (!data) return null;
    const builtin = data.catalog.brands;
    const brands = [...builtin, ...custom];
    return {
      catalog: data.catalog,
      roles: data.roles,
      builtin,
      custom,
      brands,
      glyphs: data.catalog.glyphs,
      glyphById: new Map(data.catalog.glyphs.map((g) => [g.id, g])),
      brandBySlug: new Map(brands.map((b) => [b.slug, b])),
      fuse: makeFuse(data.catalog.glyphs),
      saveCustom,
      removeCustom,
    };
  }, [data, custom, saveCustom, removeCustom]);

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
