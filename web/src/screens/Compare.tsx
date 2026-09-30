import { useMemo, useState } from "react";
import { Swatches } from "../components/Bits";
import { IconCanvas } from "../components/IconCanvas";
import { hrefFor, replaceParams } from "../lib/route";
import { searchGlyphs } from "../lib/search";
import type { Glyph } from "../lib/types";
import { useData } from "../state";

function GlyphPicker({ value, onPick }: { value: Glyph; onPick: (g: Glyph) => void }) {
  const { fuse, glyphs, catalog } = useData();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const options = useMemo(
    () => searchGlyphs(fuse, glyphs, text, catalog.standard).slice(0, 10),
    [fuse, glyphs, text, catalog.standard],
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
  const glyph = glyphById.get(params.get("g") ?? "materi") ?? glyphs[0];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Bandingkan</h1>
          <p>
            Satu glyph di semua brand. Kiri icon resmi, kanan hasil generator, supaya desainer bisa mengecek
            konsistensi.
          </p>
        </div>
        <GlyphPicker value={glyph} onPick={(g) => replaceParams("bandingkan", { g: g.id })} />
      </header>
      <div className="compare-grid">
        {brands.map((b) => {
          const has = !b.custom && glyph.official.includes(b.slug);
          return (
            <article key={b.slug} className="panel compare-card">
              <header>
                <Swatches brand={b} />
                <strong>{b.name}</strong>
              </header>
              <div className="pair">
                <figure>
                  {has ? (
                    <IconCanvas glyph={glyph} brand={b} size={112} />
                  ) : (
                    <div className="missing" style={{ width: 112, height: 112 }}>
                      belum ada
                    </div>
                  )}
                  <figcaption>Resmi</figcaption>
                </figure>
                <figure>
                  <IconCanvas glyph={glyph} brand={b} size={112} force />
                  <figcaption>Generate</figcaption>
                </figure>
              </div>
              <a className="link" href={hrefFor("generator", { brand: b.slug, g: glyph.id })}>
                Buka di Generator
              </a>
            </article>
          );
        })}
      </div>
    </div>
  );
}
