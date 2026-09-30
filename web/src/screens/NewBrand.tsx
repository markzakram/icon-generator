import { useMemo, useState } from "react";
import { BrandSelect, ColorField, Swatches } from "../components/Bits";
import { IconView } from "../components/IconView";
import { brandFromParams, brandJson, brandToParams, makeCustomBrand } from "../lib/brands";
import { copyText, downloadBlob } from "../lib/download";
import { displayName, hasV2 } from "../lib/render";
import { go, hrefFor } from "../lib/route";
import { sortDefault } from "../lib/search";
import { ROLE_LABELS, type RoleName, type Roles, type Version } from "../lib/types";
import { TOKEN_LABELS, TOKEN_NAMES, v2Tokens } from "../lib/v2/tokens";
import { useData } from "../state";

/** How each well-covered brand treats details in v1, to help pick a style reference. */
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

const ADVANCED: RoleName[] = ["primary_shade", "accent_shade", "light"];

export function NewBrand({ params }: { params: URLSearchParams }) {
  const { builtin, catalog, glyphs, saveCustom, setBrand } = useData();
  const initial = useMemo(() => brandFromParams(params), [params]);
  const [name, setName] = useState(initial?.name ?? "JadiHakim");
  const [colors, setColors] = useState<Partial<Roles>>(initial?.given ?? { primary: "#1F4E79", accent: "#F2B705" });
  const [styleRef, setStyleRef] = useState(initial?.styleRef ?? "jadipcpm");
  const [version, setVersion] = useState<Version>("v2");
  const [showAll, setShowAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const brand = useMemo(
    () => makeCustomBrand(name, { ...colors, primary: colors.primary ?? "#1F4E79" }, styleRef),
    [name, colors, styleRef],
  );
  const tokens = useMemo(() => v2Tokens(brand), [brand]);
  const refs = builtin.filter((b) => b.official >= 10);
  const list = useMemo(() => {
    const pool = version === "v2" && !showAll ? glyphs.filter(hasV2) : glyphs;
    return showAll ? sortDefault(pool, catalog.standard) : sortDefault(pool, catalog.standard).slice(0, version === "v2" ? 24 : 16);
  }, [version, showAll, glyphs, catalog.standard]);

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
        <p className="lead">Masukkan dua warna brand. Semua icon v2 langsung jadi mengikuti Panduan v2.</p>
        <label className="field">
          <span>Nama brand</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="JadiHakim" />
        </label>
        <div className="two">
          <ColorField label="Warna primer" value={colors.primary} onChange={(v) => setColor("primary", v)} />
          <ColorField label="Warna aksen" value={colors.accent} onChange={(v) => setColor("accent", v)} />
        </div>
        <details className="advanced">
          <summary>Warna lanjutan</summary>
          <p className="hint-line">Kosongkan untuk dihitung otomatis.</p>
          <div className="two">
            {ADVANCED.map((r) => (
              <ColorField
                key={r}
                optional
                label={ROLE_LABELS[r]}
                value={colors[r]}
                placeholder={r === "primary_shade" ? tokens.PD : r === "accent_shade" ? tokens.AD : brand.roles[r]}
                onChange={(v) => setColor(r, v)}
              />
            ))}
          </div>
          <BrandSelect label="Gaya referensi untuk icon v1" brands={refs} selected={styleRef} onSelect={setStyleRef} />
          <p className="hint-line">{STYLE_HINTS[styleRef] ?? ""}</p>
        </details>
        <div className="token-table" aria-label="Token warna v2">
          {TOKEN_NAMES.map((t) => (
            <div key={t} className="token">
              <span className="sw" style={{ background: tokens[t] }} />
              <span className="name">{TOKEN_LABELS[t]}</span>
              <code>{tokens[t]}</code>
            </div>
          ))}
        </div>
        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const stored = saveCustom(brand);
              setBrand(stored.slug);
              go("generator");
            }}
          >
            Simpan dan pakai
          </button>
          <button type="button" className="btn" onClick={async () => setMessage((await copyText(link)) ? "Link disalin." : link)}>
            Salin link
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => downloadBlob(new Blob([brandJson(brand)], { type: "application/json" }), `${brand.slug}.brand.json`)}
          >
            Unduh brand.json
          </button>
        </div>
        {message && <p className="note">{message}</p>}
        <p className="hint-line">
          Tersimpan di browser ini. Supaya resmi untuk seluruh tim, kirim <code>brand.json</code> ke developer untuk
          ditambahkan ke <code>catalog/brands.json</code>.
        </p>
      </section>

      <section className="panel preview-set">
        <header className="set-head">
          <div className="set-title">
            <Swatches brand={brand} size={14} />
            <strong>{brand.name}</strong>
            <span className="hint">{list.length} icon</span>
          </div>
          <div className="page-tools">
            <div className="seg-group" role="group" aria-label="Versi preview">
              {(["v2", "v1"] as Version[]).map((v) => (
                <button key={v} type="button" className={version === v ? "on" : ""} aria-pressed={version === v} onClick={() => setVersion(v)}>
                  {v === "v2" ? "Icon v2" : "v1"}
                </button>
              ))}
            </div>
            <label className="toggle">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              <span>Semua {glyphs.length} glyph</span>
            </label>
          </div>
        </header>
        <div className="grid grid-small">
          {list.map((g) => (
            <figure key={g.id} className="mini">
              <IconView glyph={g} brand={brand} size={76} version={version} />
              <figcaption>{displayName(g, version)}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
