import { useMemo, useState } from "react";
import { BrandSelect, ColorField, Swatches } from "../components/Bits";
import { IconCanvas } from "../components/IconCanvas";
import { brandFromParams, brandJson, brandToParams, makeCustomBrand } from "../lib/brands";
import { copyText, downloadBlob } from "../lib/download";
import { go, hrefFor } from "../lib/route";
import { sortDefault } from "../lib/search";
import { ROLE_LABELS, ROLE_NAMES, type RoleName, type Roles } from "../lib/types";
import { useData } from "../state";

/** How each well-covered brand treats details, to help pick a style reference. */
const STYLE_HINTS: Record<string, string> = {
  jadipcpm: "detail putih, sisi 3D warna aksen",
  jadipppk: "detail putih, sisi 3D warna aksen",
  jadiojk: "detail putih, dua warna",
  jadiprajurit: "detail putih, sisi 3D gelap",
  jadippg: "detail putih, sisi 3D abu",
  jago_tpa: "detail putih",
  toefl_academy: "detail putih, aksen navy",
  jadiasn: "detail warna aksen",
  jadibumn: "detail warna aksen",
  cerebrum: "detail warna aksen",
  jadisekdin: "detail warna aksen",
};

const ADVANCED: RoleName[] = ["primary_shade", "accent_shade", "primary_alt", "light"];

export function NewBrand({ params }: { params: URLSearchParams }) {
  const { builtin, catalog, glyphs, glyphById, saveCustom } = useData();
  const initial = useMemo(() => brandFromParams(params), [params]);
  const [name, setName] = useState(initial?.name ?? "JadiHakim");
  const [colors, setColors] = useState<Partial<Roles>>(
    initial?.given ?? { primary: "#1F4E79", accent: "#F2B705" },
  );
  const [styleRef, setStyleRef] = useState(initial?.styleRef ?? "jadipcpm");
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const brand = useMemo(
    () => makeCustomBrand(name, { ...colors, primary: colors.primary ?? "#1F4E79" }, styleRef),
    [name, colors, styleRef],
  );
  const refs = builtin.filter((b) => b.official >= 10);
  const list = useMemo(
    () =>
      showAll
        ? sortDefault(glyphs, catalog.standard)
        : catalog.standard.map((id) => glyphById.get(id)).filter((g) => g !== undefined),
    [showAll, glyphs, glyphById, catalog.standard],
  );

  const setColor = (role: RoleName, v: string | undefined) =>
    setColors((prev) => {
      const next = { ...prev };
      if (v) next[role] = v;
      else delete next[role];
      return next;
    });

  const link = `${window.location.origin}${window.location.pathname}${hrefFor("brand-baru", brandToParams(brand))}`;

  return (
    <div className="page newbrand">
      <section className="panel form">
        <h1>Brand baru</h1>
        <p className="lead">
          Masukkan warna brand dan pilih brand yang gayanya mau ditiru. Seluruh set icon langsung jadi.
        </p>
        <label className="field">
          <span>Nama brand</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Misal: JadiHakim" />
        </label>
        <div className="two">
          <ColorField label="Warna primer" value={colors.primary} onChange={(v) => setColor("primary", v)} />
          <ColorField label="Warna aksen" value={colors.accent} onChange={(v) => setColor("accent", v)} />
        </div>
        <BrandSelect
          label="Gaya referensi"
          brands={refs}
          selected={styleRef}
          onSelect={(s) => setStyleRef(s)}
        />
        <p className="hint-line">{STYLE_HINTS[styleRef] ?? ""}</p>
        <details className="advanced">
          <summary>Warna lanjutan</summary>
          <p className="hint-line">Kosongkan untuk dihitung otomatis dari warna primer dan aksen.</p>
          <div className="two">
            {ADVANCED.map((r) => (
              <ColorField
                key={r}
                optional
                label={ROLE_LABELS[r]}
                value={colors[r]}
                placeholder={brand.roles[r]}
                onChange={(v) => setColor(r, v)}
              />
            ))}
          </div>
        </details>
        <div className="token-table" aria-label="Token warna lengkap">
          {ROLE_NAMES.map((r) => (
            <div key={r} className="token">
              <span className="sw" style={{ background: brand.roles[r] }} />
              <span className="name">{ROLE_LABELS[r]}</span>
              {!brand.given[r] && <em>otomatis</em>}
              <code>{brand.roles[r]}</code>
            </div>
          ))}
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const stored = saveCustom(brand);
              go("generator", { brand: stored.slug });
            }}
          >
            Simpan &amp; pakai di Generator
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => setMessage((await copyText(link)) ? "Link disalin." : link)}
          >
            Salin link
          </button>
          <button
            type="button"
            className="btn"
            onClick={() =>
              downloadBlob(new Blob([brandJson(brand)], { type: "application/json" }), `${brand.slug}.brand.json`)
            }
          >
            Unduh brand.json
          </button>
        </div>
        {message && <p className="note">{message}</p>}
        <p className="hint-line">
          Brand baru disimpan di browser ini. Supaya resmi untuk seluruh tim, kirim <code>brand.json</code> ke
          developer untuk ditambahkan ke <code>catalog/brands.json</code>.
        </p>
      </section>

      <section className="panel preview-set">
        <header className="set-head">
          <div className="set-title">
            <Swatches brand={brand} size={14} />
            <strong>{brand.name}</strong>
            <span className="hint">
              {list.length} icon, gaya {builtin.find((b) => b.slug === styleRef)?.name}
            </span>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            <span>Semua {glyphs.length} glyph</span>
          </label>
        </header>
        <div className="grid grid-small">
          {list.map((g) => (
            <figure key={g.id} className="mini">
              <IconCanvas glyph={g} brand={brand} size={80} />
              <figcaption>{g.nama}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
