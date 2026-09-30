import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchBox } from "../components/Bits";
import { GlyphCard } from "../components/GlyphCard";
import { PreviewPanel } from "../components/PreviewPanel";
import { Tray } from "../components/Tray";
import { hasV2 } from "../lib/render";
import { replaceParams } from "../lib/route";
import type { Glyph } from "../lib/types";
import { useData } from "../state";

const EXAMPLES = ["course", "tryout", "psikotes", "TWK", "kebanksentralan", "jadwal"];
const COLLAPSED = 8;

interface Section {
  key: string;
  title: string;
  hint?: string;
  test: (g: Glyph, standard: Set<string>) => boolean;
}

const SECTIONS: Section[] = [
  { key: "menu", title: "Menu utama", hint: "paling sering dipakai", test: (g, s) => s.has(g.id) },
  { key: "subtes", title: "Subtes & tes", test: (g) => g.kategori === "subtes" },
  { key: "mapel", title: "Mata pelajaran", test: (g) => g.kategori === "mapel" },
  { key: "profesi_bidang", title: "Profesi & bidang", test: (g) => g.kategori === "profesi_bidang" },
  {
    key: "lainnya",
    title: "Lainnya",
    hint: "menu lain, lembaga, orang",
    test: (g, s) => ["menu", "lembaga", "orang", "lainnya"].includes(g.kategori) && !s.has(g.id),
  },
];

export function Generator({ params }: { params: URLSearchParams }) {
  const { brand, brandBySlug, setBrand, version, glyphs, glyphById, fuse, catalog, recent, tray } = useData();
  const q = params.get("q") ?? "";
  const cat = params.get("cat") ?? "semua";
  const gid = params.get("g");
  const onlyV2 = params.get("v2") === "1";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const searchRef = useRef<HTMLInputElement>(null);
  const standard = useMemo(() => new Set(catalog.standard), [catalog.standard]);

  const set = useCallback(
    (patch: Record<string, string | null>) =>
      replaceParams("generator", { q, cat: cat === "semua" ? null : cat, g: gid, v2: onlyV2 ? "1" : null, ...patch }),
    [q, cat, gid, onlyV2],
  );

  // a shared link may carry ?brand=...: adopt it once, then drop it from the address
  useEffect(() => {
    const b = params.get("brand");
    if (b && brandBySlug.has(b)) {
      if (b !== brand.slug) setBrand(b);
      set({});
    }
  }, [params, brandBySlug, brand.slug, setBrand, set]);

  // "/" jumps to search from anywhere on the page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pool = useMemo(() => (onlyV2 ? glyphs.filter(hasV2) : glyphs), [glyphs, onlyV2]);
  const found = useMemo(() => {
    if (!q.trim()) return null;
    const ok = new Set(pool.map((g) => g.id));
    return fuse
      .search(q.trim())
      .map((r) => r.item)
      .filter((g) => ok.has(g.id));
  }, [q, pool, fuse]);

  const ordered = useCallback(
    (list: Glyph[], key: string) => {
      if (key === "menu") return catalog.standard.map((id) => glyphById.get(id)).filter((g): g is Glyph => !!g && list.includes(g));
      return [...list].sort(
        (a, b) =>
          Number(version === "v2" && hasV2(b)) - Number(version === "v2" && hasV2(a)) ||
          b.brandCount - a.brandCount ||
          a.nama.localeCompare(b.nama, "id"),
      );
    },
    [catalog.standard, glyphById, version],
  );

  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({ ...s, items: ordered(pool.filter((g) => s.test(g, standard)), s.key) })).filter(
        (s) => s.items.length > 0,
      ),
    [pool, standard, ordered],
  );
  const recentGlyphs = useMemo(
    () => recent.map((id) => glyphById.get(id)).filter((g): g is Glyph => !!g && pool.includes(g)),
    [recent, glyphById, pool],
  );

  // typing a query shows the best match right away
  useEffect(() => {
    if (found && found.length && found[0].id !== gid) set({ g: found[0].id });
    // only when the query changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const explicit = gid ? glyphById.get(gid) : undefined;
  const selected = explicit ?? found?.[0] ?? glyphById.get(catalog.standard[0]);
  const select = (id: string) => {
    set({ g: id });
    if (window.matchMedia("(max-width: 860px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const grid = (list: Glyph[]) => (
    <div className="grid">
      {list.map((g) => (
        <GlyphCard key={g.id} glyph={g} brand={brand} version={version} selected={selected?.id === g.id} onSelect={select} />
      ))}
    </div>
  );

  const v2Count = glyphs.filter(hasV2).length;

  return (
    <div className={`gen-layout${tray.length ? " with-tray" : ""}`}>
      <section className="main-col">
        <div className="toolbar">
          <SearchBox
            ref={searchRef}
            value={q}
            placeholder="Cari icon: course, tryout, psikotes, jadwal…"
            onChange={(v) => set({ q: v || null })}
          />
          <button
            type="button"
            className={`chip chip-toggle${onlyV2 ? " on" : ""}`}
            aria-pressed={onlyV2}
            onClick={() => set({ v2: onlyV2 ? null : "1", g: null })}
          >
            Hanya v2 <span className="count">{v2Count}</span>
          </button>
        </div>

        {!q && (
          <div className="chips" role="tablist" aria-label="Kategori">
            {[{ key: "semua", title: "Semua", items: pool }, ...sections].map((s) => (
              <button
                key={s.key}
                type="button"
                role="tab"
                aria-selected={cat === s.key}
                className={`chip${cat === s.key ? " on" : ""}`}
                onClick={() => set({ cat: s.key === "semua" ? null : s.key })}
              >
                {s.title}
                <span className="count">{s.items.length}</span>
              </button>
            ))}
          </div>
        )}

        {found ? (
          <section className="group">
            <header className="group-head">
              <h2>
                {found.length} hasil untuk “{q}”
              </h2>
            </header>
            {found.length ? (
              grid(found.slice(0, 60))
            ) : (
              <div className="empty">
                Tidak ada icon yang cocok. Coba kata lain:{" "}
                {EXAMPLES.map((e, i) => (
                  <span key={e}>
                    {i > 0 && ", "}
                    <button type="button" className="link" onClick={() => set({ q: e })}>
                      {e}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {cat === "semua" && recentGlyphs.length > 0 && (
              <section className="group">
                <header className="group-head">
                  <h2>Terakhir dipakai</h2>
                </header>
                {grid(recentGlyphs.slice(0, COLLAPSED))}
              </section>
            )}
            {sections
              .filter((s) => cat === "semua" || cat === s.key)
              .map((s) => {
                const open = cat !== "semua" || s.key === "menu" || expanded[s.key];
                const list = open ? s.items : s.items.slice(0, COLLAPSED);
                return (
                  <section key={s.key} className="group">
                    <header className="group-head">
                      <h2>
                        {s.title} <span className="group-count">{s.items.length}</span>
                      </h2>
                      {s.hint && <span className="hint">{s.hint}</span>}
                      {cat === "semua" && s.key !== "menu" && s.items.length > COLLAPSED && (
                        <button
                          type="button"
                          className="link"
                          onClick={() => setExpanded((e) => ({ ...e, [s.key]: !e[s.key] }))}
                        >
                          {open ? "Ringkas" : `Lihat semua ${s.items.length}`}
                        </button>
                      )}
                    </header>
                    {grid(list)}
                  </section>
                );
              })}
          </>
        )}
      </section>

      {selected && (
        <PreviewPanel
          key={`${selected.id}|${brand.slug}`}
          glyph={selected}
          brand={brand}
          onClose={explicit ? () => set({ g: null }) : undefined}
        />
      )}
      <Tray onSelect={select} />
    </div>
  );
}
