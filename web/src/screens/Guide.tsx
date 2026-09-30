import { useState } from "react";
import { IconView } from "../components/IconView";
import { copyText, downloadBlob } from "../lib/download";
import { displayName, hasV2 } from "../lib/render";
import { sortDefault } from "../lib/search";
import type { Badge } from "../lib/v2/badges";
import { TOKEN_LABELS, TOKEN_NAMES, v2Tokens } from "../lib/v2/tokens";
import { buildZip } from "../lib/zip";
import { useData } from "../state";

const RULES: [string, string][] = [
  ["Grid 96, area aman 80%", "Gambar berada di kotak 10–86 unit, supaya semua icon terlihat sama besar."],
  ["Sisi 3D ke kiri-bawah", "Geser (−4, +4) unit, warnanya versi gelap dari warna mukanya sendiri."],
  ["Tiga warna muka", "Primer, aksen, dan terang. Detail memakai warna yang kontrasnya cukup di atas mukanya."],
  ["Detail minimal 4 unit", "Garis dan titik setebal minimal 4/96, masih terlihat di 32 px."],
  ["Versi kecil otomatis", "Di 48 px ke bawah, detail halus (garis teks, pola) dihilangkan."],
  ["Lencana, bukan gambar baru", "“Gratis”, “2026”, “PPPK” jadi lencana di pojok kanan atas."],
];

const BADGES: Badge[] = [{ kind: "gratis" }, { kind: "baru" }, { kind: "premium" }, { kind: "selesai" }, { kind: "teks", text: "2026" }];

function Anatomy() {
  return (
    <svg viewBox="0 0 260 220" className="anatomy" role="img" aria-label="Anatomi grid icon v2">
      <rect x="20" y="10" width="192" height="192" fill="none" stroke="currentColor" strokeOpacity="0.25" />
      <rect x="39.2" y="29.2" width="153.6" height="153.6" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeDasharray="5 4" />
      <rect x="60" y="56" width="104" height="128" rx="14" fill="#290746" />
      <rect x="68" y="48" width="104" height="128" rx="14" fill="#482171" />
      <rect x="86" y="72" width="64" height="10" rx="5" fill="#fff" />
      <rect x="86" y="92" width="44" height="10" rx="5" fill="#fff" />
      <path d="M68 190 l-8 0 m0 0 l3 -3 m-3 3 l3 3" stroke="#CB0560" strokeWidth="2" fill="none" />
      <text x="222" y="24" className="anatomy-text">96</text>
      <text x="198" y="178" className="anatomy-text">80%</text>
      <text x="74" y="206" className="anatomy-text">sisi 3D (−4, +4)</text>
    </svg>
  );
}

export function Guide() {
  const { brand, glyphs, catalog, roles } = useData();
  const [small, setSmall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const tokens = v2Tokens(brand);
  const v2 = sortDefault(glyphs.filter(hasV2), catalog.standard);
  const css = `/* token icon v2 ${brand.name} */\n:root {\n${TOKEN_NAMES.map((t) => `  --icon-${t.toLowerCase()}: ${tokens[t]};`).join("\n")}\n}`;

  async function downloadSvgs() {
    setBusy(true);
    try {
      const blob = await buildZip({
        brand,
        items: v2.map((glyph) => ({ glyph })),
        roles,
        presets: { umum: false, android: false, ios: false, web: false, svg: true },
        base: 64,
        version: "v2",
      });
      downloadBlob(blob, `${brand.slug}_icon_v2_svg.zip`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page guide">
      <header className="page-head">
        <div>
          <h1>Panduan icon v2</h1>
          <p>
            Aturan yang dipakai semua icon v2. Warna setiap brand diturunkan otomatis dari tokennya, jadi {v2.length} icon
            v2 tampil konsisten di brand mana pun, termasuk brand baru.
          </p>
        </div>
        <div className="page-tools">
          <button type="button" className="btn" onClick={async () => setNote((await copyText(css)) ? "Token CSS disalin." : css)}>
            Salin token CSS
          </button>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={downloadSvgs}>
            {busy ? "Menyiapkan…" : `Unduh ${v2.length} SVG ${brand.name}`}
          </button>
        </div>
      </header>
      {note && <p className="note">{note}</p>}

      <div className="guide-top">
        <section className="panel rules">
          <h2>Aturan</h2>
          <ol>
            {RULES.map(([t, d]) => (
              <li key={t}>
                <strong>{t}</strong>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="panel anatomy-card">
          <h2>Anatomi</h2>
          <Anatomy />
        </section>
        <section className="panel">
          <h2>Token {brand.name}</h2>
          <div className="token-table">
            {TOKEN_NAMES.map((t) => (
              <div key={t} className="token">
                <span className="sw" style={{ background: tokens[t] }} />
                <span className="name">
                  <code>{t}</code> {TOKEN_LABELS[t]}
                </span>
                <code>{tokens[t]}</code>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <header className="set-head">
          <h2>{v2.length} icon v2</h2>
          <label className="toggle">
            <input type="checkbox" checked={small} onChange={(e) => setSmall(e.target.checked)} />
            <span>Tampilkan juga ukuran 32 px (versi sederhana)</span>
          </label>
        </header>
        <div className="grid grid-guide">
          {v2.map((g) => (
            <figure key={g.id} className="mini">
              <div className="mini-row">
                <IconView glyph={g} brand={brand} size={80} version="v2" />
                {small && <IconView glyph={g} brand={brand} size={32} version="v2" />}
              </div>
              <figcaption>{displayName(g, "v2")}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Lencana</h2>
        <div className="badge-row">
          {BADGES.map((b) => (
            <figure key={b.kind} className="mini">
              <IconView glyph={v2[1] ?? v2[0]} brand={brand} size={80} version="v2" badge={b} />
              <figcaption>{b.kind === "teks" ? "teks “2026”" : b.kind}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
