import { useMemo, useState } from "react";
import { BrandSelect } from "../components/Bits";
import { IconView } from "../components/IconView";
import { downloadBlob } from "../lib/download";
import { effectiveVersion, hasV2, sourceFor } from "../lib/render";
import { sortDefault } from "../lib/search";
import type { Glyph, Version } from "../lib/types";
import { ANDROID, buildZip, fileBase, filesPerIcon, UMUM_SIZES, type Presets, type ZipItem } from "../lib/zip";
import { useData } from "../state";

type Source = "daftar" | "standar" | "v2" | "semua" | "kosong";

export function Export({ params }: { params: URLSearchParams }) {
  const { brands, brand, setBrand, glyphs, glyphById, catalog, roles, tray, version: globalVersion } = useData();
  const [source, setSource] = useState<Source>(() =>
    params.get("sumber") === "daftar" && tray.length ? "daftar" : "standar",
  );
  const [version, setVersion] = useState<Version>(globalVersion);
  const [presets, setPresets] = useState<Presets>({ umum: true, android: true, ios: true, web: true, svg: true });
  const [base, setBase] = useState(64);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items: ZipItem[] = useMemo(() => {
    const plain = (list: Glyph[]) => list.map((glyph) => ({ glyph }));
    switch (source) {
      case "daftar":
        return tray.map((t) => ({ glyph: glyphById.get(t.id)!, badge: t.badge })).filter((t) => t.glyph);
      case "standar":
        return plain(catalog.standard.map((id) => glyphById.get(id)).filter((g): g is Glyph => !!g));
      case "v2":
        return plain(sortDefault(glyphs.filter(hasV2), catalog.standard));
      case "semua":
        return plain(sortDefault(glyphs, catalog.standard));
      default:
        return plain(
          sortDefault(
            glyphs.filter((g) => sourceFor(g, brand) === "generate"),
            catalog.standard,
          ),
        );
    }
  }, [source, tray, glyphById, catalog.standard, glyphs, brand]);

  const nV2 = items.filter((t) => effectiveVersion(t.glyph, version) === "v2").length;
  const nFiles = items.reduce((s, t) => s + filesPerIcon(presets, effectiveVersion(t.glyph, version) === "v2"), 0);
  const anyPreset = Object.values(presets).some(Boolean);
  const sample = items[0] ?? { glyph: glyphById.get("materi")! };
  const name = fileBase(brand, sample.glyph, sample.badge);

  async function run() {
    setError(null);
    setProgress({ done: 0, total: items.length });
    try {
      const blob = await buildZip({
        brand,
        items,
        roles,
        presets,
        base,
        version,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      downloadBlob(blob, `${brand.slug}_icon_${source}.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  }

  const toggle = (k: keyof Presets) => setPresets((p) => ({ ...p, [k]: !p[k] }));
  const sources: [Source, string, number][] = [
    ["daftar", "Daftar unduhan", tray.length],
    ["standar", "16 menu utama", catalog.standard.length],
    ["v2", "Semua icon v2", glyphs.filter(hasV2).length],
    ["semua", "Semua glyph", glyphs.length],
    ["kosong", "Yang belum ada icon resminya", glyphs.filter((g) => sourceFor(g, brand) === "generate").length],
  ];

  return (
    <div className="page export">
      <section className="panel form">
        <h1>Unduh set</h1>
        <p className="lead">Unduh banyak icon sekaligus untuk satu brand, lengkap untuk Android, iOS, web, dan SVG.</p>
        <BrandSelect brands={brands} selected={brand.slug} onSelect={setBrand} />

        <fieldset>
          <legend>Icon yang diunduh</legend>
          {sources.map(([k, label, n]) => (
            <label key={k} className={`radio${n === 0 ? " disabled" : ""}`}>
              <input type="radio" name="sumber" checked={source === k} disabled={n === 0} onChange={() => setSource(k)} />
              <span>
                {label} <em>{n} icon</em>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Versi</legend>
          <label className="radio">
            <input type="radio" name="versi" checked={version === "v2"} onChange={() => setVersion("v2")} />
            <span>
              Pakai v2 bila ada <em>sisanya v1</em>
            </span>
          </label>
          <label className="radio">
            <input type="radio" name="versi" checked={version === "v1"} onChange={() => setVersion("v1")} />
            <span>Hanya v1 (icon lama)</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Format</legend>
          <label className="check">
            <input type="checkbox" checked={presets.umum} onChange={() => toggle("umum")} />
            <span>
              Umum <em>{UMUM_SIZES.join(", ")} px</em>
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={presets.android} onChange={() => toggle("android")} />
            <span>
              Android <em>{ANDROID.map(([d]) => d).join(", ")}</em>
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={presets.ios} onChange={() => toggle("ios")} />
            <span>
              iOS <em>@1x, @2x, @3x + Contents.json</em>
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={presets.web} onChange={() => toggle("web")} />
            <span>
              Web <em>1x dan 2x, PNG dan WebP</em>
            </span>
          </label>
          <label className="check">
            <input type="checkbox" checked={presets.svg} onChange={() => toggle("svg")} />
            <span>
              SVG <em>hanya icon v2, versi detail dan kecil</em>
            </span>
          </label>
        </fieldset>

        <label className="field narrow">
          <span>Ukuran dasar Android/iOS/Web (dp, pt, px)</span>
          <input
            type="number"
            min={16}
            max={512}
            value={base}
            onChange={(e) => setBase(Math.max(16, Math.min(512, Number(e.target.value) || 64)))}
          />
        </label>
        {base <= 48 && <p className="hint-line">Ukuran ini memakai versi sederhana icon v2 (detail halus dihilangkan).</p>}

        <p className="summary">
          {items.length} icon ({nV2} v2) = <strong>{nFiles} file</strong>.
        </p>
        <button type="button" className="btn btn-primary" disabled={!!progress || !anyPreset || !items.length} onClick={run}>
          {progress ? `Menyiapkan ${progress.done}/${progress.total}…` : "Buat ZIP"}
        </button>
        {progress && <progress value={progress.done} max={progress.total} />}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel side">
        <h2>Isi unduhan</h2>
        <div className="mini-grid">
          {items.slice(0, 40).map((t) => (
            <span key={t.glyph.id} title={t.glyph.nama}>
              <IconView glyph={t.glyph} brand={brand} size={44} version={version} badge={t.badge} />
            </span>
          ))}
          {items.length > 40 && <span className="more">+{items.length - 40}</span>}
        </div>
        <h2>Struktur file</h2>
        <pre className="tree">
          {[
            `${brand.slug}_icon_${source}.zip`,
            presets.umum && `├─ umum/${name}_512.png  (juga 1024, 256, 128)`,
            presets.android && `├─ android/drawable-xxhdpi/ic_${name}.png  (mdpi … xxxhdpi)`,
            presets.ios && `├─ ios/${name}.imageset/${name}@2x.png  (+ @1x, @3x, Contents.json)`,
            presets.web && `├─ web/${name}.png  (+ @2x, .webp)`,
            presets.svg && `├─ svg/${name}.svg  (+ _kecil.svg, icon v2)`,
            "└─ README.txt  (daftar icon: v2, resmi, atau generate)",
          ]
            .filter(Boolean)
            .join("\n")}
        </pre>
      </section>
    </div>
  );
}
