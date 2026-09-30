import { useCallback, useMemo } from "react";
import { BrandList, BrandSelect, SearchBox, SourceBadge } from "../components/Bits";
import { IconCanvas } from "../components/IconCanvas";
import { PreviewPanel } from "../components/PreviewPanel";
import { sourceFor } from "../lib/render";
import { hrefFor, replaceParams } from "../lib/route";
import { searchGlyphs } from "../lib/search";
import { CATEGORY_LABELS } from "../lib/types";
import { useData } from "../state";

const EXAMPLES = ["course", "tryout", "kebanksentralan", "psikotes", "TWK", "numerik"];
const CATS = ["semua", "standar", ...Object.keys(CATEGORY_LABELS)];

export function Generator({ params }: { params: URLSearchParams }) {
  const { brands, brandBySlug, glyphs, glyphById, fuse, catalog } = useData();
  const brand = brandBySlug.get(params.get("brand") ?? "jadipcpm") ?? brands[0];
  const q = params.get("q") ?? "";
  const cat = params.get("cat") ?? "semua";
  const gid = params.get("g");

  const set = useCallback(
    (patch: Record<string, string | null>) =>
      replaceParams("generator", { brand: brand.slug, q, cat: cat === "semua" ? null : cat, g: gid, ...patch }),
    [brand.slug, q, cat, gid],
  );

  const found = useMemo(() => searchGlyphs(fuse, glyphs, q, catalog.standard), [fuse, glyphs, q, catalog.standard]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { semua: found.length, standar: 0 };
    for (const g of found) {
      c[g.kategori] = (c[g.kategori] ?? 0) + 1;
      if (catalog.standard.includes(g.id)) c.standar++;
    }
    return c;
  }, [found, catalog.standard]);
  const results = useMemo(() => {
    if (cat === "semua") return found;
    if (cat === "standar") return found.filter((g) => catalog.standard.includes(g.id));
    return found.filter((g) => g.kategori === cat);
  }, [found, cat, catalog.standard]);

  const selected = (gid ? glyphById.get(gid) : undefined) ?? results[0];
  const nOfficial = results.filter((g) => sourceFor(g, brand) === "resmi").length;

  return (
    <div className="gen-layout">
      <aside className="panel brand-panel" aria-label="Pilih brand">
        <div className="panel-title">
          <span>Brand</span>
          <span className="hint">icon resmi</span>
        </div>
        <BrandList brands={brands} selected={brand.slug} onSelect={(s) => set({ brand: s })} />
        <a className="btn btn-ghost btn-block" href={hrefFor("brand-baru")}>
          + Brand baru
        </a>
      </aside>

      <section className="main-col">
        <div className="toolbar">
          <BrandSelect
            className="only-narrow"
            brands={brands}
            selected={brand.slug}
            onSelect={(s) => set({ brand: s })}
          />
          <SearchBox
            value={q}
            placeholder="Cari icon: course, tryout, kebanksentralan…"
            onChange={(v) => set({ q: v || null, g: null })}
          />
        </div>
        <div className="examples">
          <span>Contoh:</span>
          {EXAMPLES.map((e) => (
            <button key={e} type="button" className="link" onClick={() => set({ q: e, g: null, cat: null })}>
              {e}
            </button>
          ))}
        </div>
        <div className="chips" role="tablist" aria-label="Kategori">
          {CATS.filter((c) => c === "semua" || counts[c]).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={cat === c}
              className={`chip${cat === c ? " on" : ""}`}
              onClick={() => set({ cat: c === "semua" ? null : c, g: null })}
            >
              {c === "semua" ? "Semua" : c === "standar" ? "16 standar" : CATEGORY_LABELS[c]}
              <span className="count">{counts[c] ?? 0}</span>
            </button>
          ))}
        </div>
        <p className="result-meta">
          {results.length} icon untuk <strong>{brand.name}</strong>: {nOfficial} resmi, {results.length - nOfficial}{" "}
          dibuat generator
        </p>
        {results.length === 0 ? (
          <div className="empty">
            Tidak ada icon yang cocok dengan “{q}”. Coba kata lain, misalnya “materi” atau “ujian”.
          </div>
        ) : (
          <div className="grid">
            {results.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`card${selected?.id === g.id ? " selected" : ""}`}
                aria-pressed={selected?.id === g.id}
                onClick={() => {
                  set({ g: g.id });
                  if (window.matchMedia("(max-width: 860px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                <IconCanvas glyph={g} brand={brand} size={84} />
                <span className="card-name">{g.nama}</span>
                <SourceBadge source={sourceFor(g, brand)} />
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && <PreviewPanel glyph={selected} brand={brand} />}
    </div>
  );
}
