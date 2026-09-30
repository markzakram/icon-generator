import { useMemo, useState } from "react";
import { Swatches } from "../components/Bits";
import { IconView } from "../components/IconView";
import { displayName, hasV2, sourceFor } from "../lib/render";
import { hrefFor, replaceParams } from "../lib/route";
import { searchGlyphs } from "../lib/search";
import type { Glyph } from "../lib/types";
import { useData } from "../state";

type Mode = "v1v2" | "resmi";

function GlyphPicker({ value, onPick, only }: { value: Glyph; onPick: (g: Glyph) => void; only?: (g: Glyph) => boolean }) {
  const { fuse, glyphs, catalog } = useData();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => searchGlyphs(fuse, glyphs, text, catalog.standard).filter((g) => !only || only(g)).slice(0, 12),
    [fuse, glyphs, text, catalog.standard, only],
  );
  return (
    <div className="picker">
      <label className="field">
        <span>Glyph</span>
        <input
          type="search"
          value={open ? text : value.nama}
          placeholder="Cari glyph…"
          onFocus={() => {
            setOpen(true);
            setText("");
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && options[0]) {
              onPick(options[0]);
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </label>
      {open && (
        <ul className="picker-list" role="listbox">
          {options.map((g) => (
            <li key={g.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(g);
                  setOpen(false);
                }}
              >
                <span>{g.nama}</span>
                <code>{g.id}</code>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Compare({ params }: { params: URLSearchParams }) {
  const { brands, glyphById, glyphs } = useData();
  const mode: Mode = params.get("mode") === "resmi" ? "resmi" : "v1v2";
  const fallback = mode === "v1v2" ? glyphById.get("materi")! : glyphs[0];
  let glyph = glyphById.get(params.get("g") ?? "materi") ?? fallback;
  if (mode === "v1v2" && !hasV2(glyph)) glyph = fallback;
  const set = (patch: Record<string, string | null>) => replaceParams("bandingkan", { g: glyph.id, mode, ...patch });

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Bandingkan</h1>
          <p>
            {mode === "v1v2"
              ? "Icon lama (v1) di samping icon baru (v2) untuk setiap brand."
              : "Icon resmi di samping hasil generator v1, untuk mengecek akurasi warna."}
          </p>
        </div>
        <div className="page-tools">
          <div className="seg-group" role="group" aria-label="Mode">
            <button type="button" className={mode === "v1v2" ? "on" : ""} aria-pressed={mode === "v1v2"} onClick={() => set({ mode: null })}>
              v1 vs v2
            </button>
            <button type="button" className={mode === "resmi" ? "on" : ""} aria-pressed={mode === "resmi"} onClick={() => set({ mode: "resmi" })}>
              Resmi vs generate
            </button>
          </div>
          <GlyphPicker value={glyph} onPick={(g) => set({ g: g.id })} only={mode === "v1v2" ? hasV2 : undefined} />
        </div>
      </header>
      <div className="compare-grid">
        {brands.map((b) => {
          const official = sourceFor(glyph, b) === "resmi";
          return (
            <article key={b.slug} className="panel compare-card">
              <header>
                <Swatches brand={b} />
                <strong>{b.name}</strong>
              </header>
              <div className="pair">
                <figure>
                  {mode === "resmi" && !official ? (
                    <div className="missing" style={{ width: 104, height: 104 }}>
                      belum ada
                    </div>
                  ) : (
                    <IconView glyph={glyph} brand={b} size={104} version="v1" />
                  )}
                  <figcaption>{mode === "v1v2" ? (official ? "v1 resmi" : "v1 generate") : "Resmi"}</figcaption>
                </figure>
                <figure>
                  {mode === "v1v2" ? (
                    <IconView glyph={glyph} brand={b} size={104} version="v2" />
                  ) : (
                    <IconView glyph={glyph} brand={b} size={104} version="v1" force />
                  )}
                  <figcaption>{mode === "v1v2" ? "v2 baru" : "Generate"}</figcaption>
                </figure>
              </div>
              <a className="link" href={hrefFor("generator", { brand: b.slug, g: glyph.id })}>
                Buka {displayName(glyph, mode === "v1v2" ? "v2" : "v1")} di Buat icon
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
