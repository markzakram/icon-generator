import JSZip from "jszip";
import { useMemo, useRef, useState } from "react";
import { SvgImg } from "../components/SvgImg";
import { hueDiff, lch } from "../lib/color";
import { dataUrl } from "../lib/data";
import { downloadBlob, downloadText } from "../lib/download";
import { appIconSvg, lockupSvg, markSvg, type Kit } from "../lib/logo/compose";
import { useLogoKit } from "../lib/logo/kit";
import { exportFamily, importFamily, ORIGINAL_ART, removeLogo, useFamily } from "../lib/logo/store";
import type { LogoSpec } from "../lib/logo/types";
import { hrefFor } from "../lib/route";

type View = "lockup" | "logo" | "ikon";

const VIEWS: [View, string][] = [
  ["lockup", "Logo + teks"],
  ["logo", "Logo"],
  ["ikon", "Ikon app"],
];

function Art({ spec, kit, view, dark }: { spec: LogoSpec; kit: Kit; view: View; dark: boolean }) {
  const scheme = dark ? "gelap" : "warna";
  if (view === "ikon") return <SvgImg className="fam-icon" svg={appIconSvg(spec, kit, { style: "terang", shape: "persegi", safe: 0.8 }).svg} alt="" />;
  if (view === "logo") return <SvgImg className="fam-mark" svg={markSvg(spec, kit, scheme, { tight: true }).svg} alt="" />;
  return <SvgImg className="fam-lockup" svg={lockupSvg(spec, kit, scheme, "susun").svg} alt="" />;
}

function Card({ spec, kit, view, dark, compare }: { spec: LogoSpec; kit: Kit; view: View; dark: boolean; compare: boolean }) {
  const original = ORIGINAL_ART[spec.id];
  const showOriginal = compare && original && view !== "ikon";
  const title = `${spec.family} ${spec.name}`.trim();
  return (
    <article className="panel fam-card">
      <div className={`fam-stage${dark ? " dark" : ""}${showOriginal ? " split" : ""}`}>
        {showOriginal && (
          <figure>
            <img src={dataUrl(view === "logo" ? original.mark : original.lockup)} alt={`${title} (asli)`} />
            <figcaption>Asli (PNG)</figcaption>
          </figure>
        )}
        <figure>
          <Art spec={spec} kit={kit} view={view} dark={dark} />
          {showOriginal && <figcaption>Baru (vektor)</figcaption>}
        </figure>
      </div>
      <footer>
        <span className="fam-colors" aria-hidden>
          <i style={{ background: spec.dark }} />
          <i style={{ background: spec.bright }} />
        </span>
        <strong>{title}</strong>
        <em>{spec.builtin ? "sudah ada" : "buatan sendiri"}</em>
        <span className="fam-actions">
          <a className="btn btn-sm" href={hrefFor("logo", { id: spec.id })}>
            {spec.builtin ? "Buat varian" : "Edit"}
          </a>
          {!spec.builtin && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => window.confirm(`Hapus ${title} dari keluarga logo?`) && removeLogo(spec.id)}
            >
              Hapus
            </button>
          )}
        </span>
      </footer>
    </article>
  );
}

/** Pairs of apps whose main colors are close enough to be confused. */
function closePairs(family: LogoSpec[]): [LogoSpec, LogoSpec, number][] {
  const out: [LogoSpec, LogoSpec, number][] = [];
  for (let i = 0; i < family.length; i++) {
    for (let j = i + 1; j < family.length; j++) {
      const d = hueDiff(lch(family[i].bright)[2], lch(family[j].bright)[2]);
      if (d < 22) out.push([family[i], family[j], d]);
    }
  }
  return out;
}

export function LogoFamily() {
  const { kit, error } = useLogoKit();
  const family = useFamily();
  const [view, setView] = useState<View>("lockup");
  const [compare, setCompare] = useState(true);
  const [dark, setDark] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const byHue = useMemo(() => [...family].sort((a, b) => lch(a.bright)[2] - lch(b.bright)[2]), [family]);
  const close = useMemo(() => closePairs(family), [family]);
  const own = family.filter((f) => !f.builtin).length;

  if (error) return <div className="empty">{error}</div>;
  if (!kit) {
    return (
      <div className="fullscreen">
        <div className="spinner" aria-hidden />
        <p>Memuat font dan piktogram…</p>
      </div>
    );
  }

  const downloadAll = async () => {
    setBusy(true);
    try {
      const zip = new JSZip();
      for (const f of family) {
        const dir = zip.folder(f.id)!;
        dir.file(`${f.id}_logo.svg`, markSvg(f, kit, "warna").svg);
        dir.file(`${f.id}_logo-teks.svg`, lockupSvg(f, kit, "warna", "susun").svg);
        dir.file(`${f.id}_logo-teks_gelap.svg`, lockupSvg(f, kit, "gelap", "susun").svg);
        dir.file(`${f.id}_logo-teks-baris.svg`, lockupSvg(f, kit, "warna", "baris").svg);
      }
      downloadBlob(await zip.generateAsync({ type: "blob" }), "keluarga-logo_svg.zip");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const n = importFamily(await file.text());
      setNote(`${n} logo diimpor.`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="page logo-family">
      <header className="page-head">
        <div>
          <h1>Keluarga logo</h1>
          <p>
            {family.length - own} logo yang sudah ada, dibangun ulang sebagai vektor, dan {own} logo buatan sendiri. Logo
            buatan sendiri tersimpan di browser ini: ekspor JSON untuk memindahkan atau membagikannya.
          </p>
        </div>
        <div className="page-tools">
          <a className="btn btn-primary" href={hrefFor("logo")}>
            + Logo baru
          </a>
          <button type="button" className="btn" disabled={busy} onClick={downloadAll}>
            {busy ? "Menyiapkan…" : "Unduh semua SVG"}
          </button>
          <button type="button" className="btn" disabled={!own} onClick={() => downloadText(exportFamily(), "keluarga-logo.json", "application/json")}>
            Ekspor JSON
          </button>
          <button type="button" className="btn" onClick={() => importRef.current?.click()}>
            Impor JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              void onImport(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </header>
      {note && <p className="note">{note}</p>}

      <div className="toolbar fam-toolbar">
        <div className="seg-group" role="group" aria-label="Tampilan">
          {VIEWS.map(([v, label]) => (
            <button key={v} type="button" className={view === v ? "on" : ""} aria-pressed={view === v} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
        <label className="check">
          <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} />
          Bandingkan dengan file asli
        </label>
        <label className="check">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          Latar gelap
        </label>
      </div>

      <div className="panel fam-hues">
        <span className="label">Warna keluarga</span>
        <div className="hue-row">
          {byHue.map((f) => (
            <span key={f.id} className="hue-chip" title={`${f.bright} / ${f.dark}`}>
              <i style={{ background: f.bright }} />
              {f.name}
            </span>
          ))}
        </div>
        {close.length > 0 ? (
          close.map(([a, b, d]) => (
            <p key={`${a.id}-${b.id}`} className="warn">
              {a.name} dan {b.name} warnanya berdekatan (selisih {Math.round(d)}°): mudah tertukar di layar ponsel.
            </p>
          ))
        ) : (
          <p className="hint">Semua warna cukup berbeda satu sama lain.</p>
        )}
      </div>

      <div className={`fam-grid view-${view}`}>
        {family.map((f) => (
          <Card key={f.id} spec={f} kit={kit} view={view} dark={dark} compare={compare} />
        ))}
      </div>
    </div>
  );
}
