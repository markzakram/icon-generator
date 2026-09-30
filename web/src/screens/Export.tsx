import { useEffect, useMemo, useState } from "react";
import { BrandSelect } from "../components/Bits";
import { downloadBlob } from "../lib/download";
import { sourceFor } from "../lib/render";
import { sortDefault } from "../lib/search";
import { ANDROID, buildZip, filesPerGlyph, UMUM_SIZES, type Presets } from "../lib/zip";
import { useData } from "../state";

type SetKind = "standar" | "semua" | "kosong";

export function Export({ params }: { params: URLSearchParams }) {
  const { brands, brandBySlug, glyphs, glyphById, catalog, roles } = useData();
  const [slug, setSlug] = useState(params.get("brand") ?? "jadipcpm");
  const brand = brandBySlug.get(slug) ?? brands[0];
  const [kind, setKind] = useState<SetKind>("standar");
  const [presets, setPresets] = useState<Presets>({ umum: true, android: true, ios: true, web: true });
  const [base, setBase] = useState(64);
  const [perGlyph, setPerGlyph] = useState(0);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    filesPerGlyph(presets).then(setPerGlyph);
  }, [presets]);

  const list = useMemo(() => {
    if (kind === "standar") return catalog.standard.map((id) => glyphById.get(id)).filter((g) => g !== undefined);
    const all = sortDefault(glyphs, catalog.standard);
    return kind === "semua" ? all : all.filter((g) => sourceFor(g, brand) === "generate");
  }, [kind, glyphs, glyphById, catalog.standard, brand]);

  const nOfficial = list.filter((g) => sourceFor(g, brand) === "resmi").length;
  const anyPreset = Object.values(presets).some(Boolean);
  const sample = list[0];
  const name = sample ? `${brand.slug}_${sample.id}` : `${brand.slug}_materi`;

  async function run() {
    setError(null);
    setProgress({ done: 0, total: list.length });
    try {
      const blob = await buildZip({
        brand,
        glyphs: list,
        roles,
        presets,
        base,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      downloadBlob(blob, `${brand.slug}_icon_${kind}.zip`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  }

  const toggle = (k: keyof Presets) => setPresets((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="page export">
      <section className="panel form">
        <h1>Export</h1>
        <p className="lead">Unduh icon satu brand sekaligus, lengkap dengan ukuran untuk Android, iOS, dan web.</p>
        <BrandSelect brands={brands} selected={brand.slug} onSelect={setSlug} />

        <fieldset>
          <legend>Icon yang diunduh</legend>
          {(
            [
              ["standar", `16 icon standar`],
              ["semua", `Semua ${glyphs.length} glyph`],
              ["kosong", "Hanya yang belum ada icon resminya"],
            ] as [SetKind, string][]
          ).map(([k, label]) => (
            <label key={k} className="radio">
              <input type="radio" name="set" checked={kind === k} onChange={() => setKind(k)} />
              <span>{label}</span>
            </label>
          ))}
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

        <p className="summary">
          {list.length} icon × {perGlyph} file = <strong>{list.length * perGlyph} file</strong>. {nOfficial} icon resmi,{" "}
          {list.length - nOfficial} dibuat generator.
        </p>
        <button type="button" className="btn btn-primary" disabled={!!progress || !anyPreset || !list.length} onClick={run}>
          {progress ? `Menyiapkan ${progress.done}/${progress.total}…` : "Buat ZIP"}
        </button>
        {progress && <progress value={progress.done} max={progress.total} />}
        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>Struktur file</h2>
        <pre className="tree">
          {[
            `${brand.slug}_icon_${kind}.zip`,
            presets.umum && `├─ umum/${name}_512.png  (juga 1024, 256, 128)`,
            presets.android && `├─ android/drawable-xxhdpi/ic_${name}.png  (mdpi … xxxhdpi)`,
            presets.ios && `├─ ios/${name}.imageset/${name}@2x.png  (+ @1x, @3x, Contents.json)`,
            presets.web && `├─ web/${name}.png  (+ @2x, .webp)`,
            "└─ README.txt  (daftar icon: resmi atau generate)",
          ]
            .filter(Boolean)
            .join("\n")}
        </pre>
        <p className="hint-line">
          Nama file mengikuti PRD: huruf kecil, angka, dan garis bawah, sehingga aman sebagai nama resource Android.
        </p>
      </section>
    </div>
  );
}
