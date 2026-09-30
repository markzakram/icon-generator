import { useEffect, useState } from "react";
import { downloadBlob } from "../lib/download";
import { renderBase, resizeTo, sourceFor, toBlob } from "../lib/render";
import { CATEGORY_LABELS, type Brand, type Glyph } from "../lib/types";
import { buildZip, UMUM_SIZES } from "../lib/zip";
import { useData } from "../state";
import { SourceBadge } from "./Bits";
import { IconCanvas } from "./IconCanvas";

type Bg = "checker" | "light" | "dark";

export function PreviewPanel({ glyph, brand }: { glyph: Glyph; brand: Brand }) {
  const { roles, brandBySlug } = useData();
  const [force, setForce] = useState(false);
  const [bg, setBg] = useState<Bg>("checker");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForce(false);
    setError(null);
  }, [glyph.id, brand.slug]);

  const hasOfficial = sourceFor(glyph, brand) === "resmi";
  const source = sourceFor(glyph, brand, force);
  const confKey = brand.custom ? (brand.styleRef ?? "") : brand.slug;
  const conf = roles[glyph.id]?.conf[confKey] ?? [];
  const unsure = source === "generate" && !brand.custom ? conf.filter((c) => c < 0.5).length : 0;
  const ref = brand.styleRef ? brandBySlug.get(brand.styleRef) : undefined;

  async function run(label: string, job: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await job();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const downloadPng = (px: number) =>
    run(`png-${px}`, async () => {
      const { surface } = await renderBase(glyph, brand, roles, { thumb: false, force });
      downloadBlob(await toBlob(resizeTo(surface, px)), `${brand.slug}_${glyph.id}_${px}.png`);
    });

  const downloadPack = () =>
    run("zip", async () => {
      const blob = await buildZip({
        brand,
        glyphs: [glyph],
        roles,
        presets: { umum: true, android: true, ios: true, web: true },
        base: 64,
        force,
      });
      downloadBlob(blob, `${brand.slug}_${glyph.id}.zip`);
    });

  let note: string;
  if (source === "resmi") note = `Icon resmi ${brand.name}, dirapikan ke canvas persegi.`;
  else if (brand.custom) note = `Dibuat otomatis dengan gaya ${ref?.name ?? brand.styleRef}.`;
  else if (hasOfficial) note = `Versi generate, untuk dibandingkan dengan icon resmi.`;
  else note = `${brand.name} belum punya icon ini. Dibuat otomatis dari ${glyph.brandCount} brand lain.`;

  return (
    <aside className="panel preview" aria-label="Preview icon">
      <div className={`stage bg-${bg}`}>
        <IconCanvas glyph={glyph} brand={brand} size={248} thumb={false} force={force} />
      </div>
      <div className="stage-tools" role="group" aria-label="Latar preview">
        {(["checker", "light", "dark"] as Bg[]).map((b) => (
          <button
            key={b}
            type="button"
            className={`seg${bg === b ? " on" : ""}`}
            aria-pressed={bg === b}
            onClick={() => setBg(b)}
          >
            {b === "checker" ? "Transparan" : b === "light" ? "Terang" : "Gelap"}
          </button>
        ))}
      </div>

      <div className="preview-head">
        <h2>{glyph.nama}</h2>
        <SourceBadge source={source} />
      </div>
      <p className="meta">
        <code>{glyph.id}</code> · {CATEGORY_LABELS[glyph.kategori] ?? glyph.kategori} · ada di {glyph.brandCount} brand
      </p>
      <p className="note">{note}</p>
      {hasOfficial && (
        <label className="toggle">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          <span>Tampilkan versi generate</span>
        </label>
      )}
      {unsure > 0 && (
        <p className="warn">
          {unsure} bagian warnanya kurang yakin. Cek dulu di layar Bandingkan sebelum dipakai.
        </p>
      )}

      <div className="block">
        <span className="label">Unduh PNG</span>
        <div className="btn-row">
          {UMUM_SIZES.map((px) => (
            <button key={px} type="button" className="btn" disabled={!!busy} onClick={() => downloadPng(px)}>
              {busy === `png-${px}` ? "…" : `${px} px`}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-block" disabled={!!busy} onClick={downloadPack}>
          {busy === "zip" ? "Menyiapkan paket…" : "Paket Android, iOS, Web (.zip)"}
        </button>
        <p className="filename">
          Nama file: <code>{`${brand.slug}_${glyph.id}_512.png`}</code>
        </p>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="block">
        <span className="label">Kata kunci pencarian</span>
        <div className="tags">
          {[...new Set([...glyph.alias, ...glyph.sinonim])].slice(0, 14).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
