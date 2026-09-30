import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArtCard } from "../components/logo/ArtCard";
import { ColorPicker } from "../components/logo/ColorPicker";
import { PictoPicker } from "../components/logo/PictoPicker";
import { SvgImg } from "../components/SvgImg";
import { downloadBlob } from "../lib/download";
import {
  appIconSvg,
  faviconSvg,
  ICON_STYLES,
  lockupSvg,
  markSvg,
  wordmarkSvg,
  type IconStyle,
  type Kit,
} from "../lib/logo/compose";
import { buildLogoPack } from "../lib/logo/export";
import { setCustomFont, useLogoKit } from "../lib/logo/kit";
import { rankSwatches } from "../lib/logo/palette";
import { suggestPictos } from "../lib/logo/picto";
import { loadDraft, saveDraft, saveLogo, slugify, useFamily } from "../lib/logo/store";
import { fontFromFile, shapeText } from "../lib/logo/text";
import type { LogoSpec } from "../lib/logo/types";
import { replaceParams } from "../lib/route";

function freshSpec(family: LogoSpec[], kit: Kit | null): LogoSpec {
  const s = rankSwatches(family.map((f) => f.bright))[0];
  const base: LogoSpec = {
    id: "",
    family: "Product",
    name: "Insight",
    desc: "dashboard metrik produk",
    bright: s.bright,
    dark: s.dark,
    picto: { kind: "lucide", id: "chart-line" },
  };
  const first = suggestPictos(base, kit?.lucide ?? null, 1)[0];
  return first ? { ...base, picto: first } : base;
}

function initialSpec(id: string | null, family: LogoSpec[]): LogoSpec | null {
  if (id) {
    const found = family.find((f) => f.id === id);
    if (found) return found.builtin ? { ...found, builtin: undefined } : found;
  }
  return loadDraft();
}

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="lm-step">
      <h2>
        <span className="lm-n">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LogoMaker({ params }: { params: URLSearchParams }) {
  const { kit, error } = useLogoKit();
  const family = useFamily();
  const editId = params.get("id");
  const [spec, setSpec] = useState<LogoSpec | null>(() => initialSpec(editId, family));
  const [iconStyle, setIconStyle] = useState<IconStyle>("terang");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const loadedFor = useRef(editId);

  // opening another logo from the family view
  useEffect(() => {
    if (editId === loadedFor.current) return;
    loadedFor.current = editId;
    const next = initialSpec(editId, family);
    if (next) setSpec(next);
  }, [editId, family]);

  // first visit: a worked example, colored to stand apart from the family
  useEffect(() => {
    if (!spec && kit) setSpec(freshSpec(family, kit));
  }, [spec, kit, family]);

  useEffect(() => {
    if (spec && !editId) saveDraft(spec);
  }, [spec, editId]);

  const others = useMemo(() => family.filter((f) => f.id !== (spec?.id || editId)), [family, spec?.id, editId]);

  if (error) return <div className="empty">{error}</div>;
  if (!kit || !spec) {
    return (
      <div className="fullscreen">
        <div className="spinner" aria-hidden />
        <p>Memuat font dan piktogram…</p>
      </div>
    );
  }

  const patch = (p: Partial<LogoSpec>) => setSpec((s) => (s ? { ...s, ...p } : s));
  const file = spec.id || slugify(spec.family, spec.name);
  const fromBuiltin = !!editId && family.some((f) => f.id === editId && f.builtin);
  const missing = [...new Set([...shapeText(kit.font, spec.family, 10).missing, ...shapeText(kit.font, spec.name, 10).missing])];
  const canSave = spec.name.trim().length > 0;

  const save = () => {
    const id = saveLogo({ ...spec, id: fromBuiltin ? "" : spec.id });
    setSpec({ ...spec, id });
    loadedFor.current = id;
    replaceParams("logo", { id });
    setNote(`Tersimpan di Keluarga logo sebagai ${id}.`);
  };

  const pack = async () => {
    setBusy("Menyiapkan…");
    try {
      const blob = await buildLogoPack({ ...spec, id: file }, kit, {
        iconStyle,
        onProgress: (d, t) => setBusy(`Menyiapkan ${d}/${t}…`),
      });
      downloadBlob(blob, `${file}_logo.zip`);
      setNote("Paket logo diunduh: SVG, PNG, ikon iOS/Android, dan favicon.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const reset = () => {
    replaceParams("logo", {});
    loadedFor.current = null;
    setSpec(freshSpec(family, kit));
    setNote(null);
  };

  const loadFont = async (f: File | undefined) => {
    if (!f) return;
    try {
      setCustomFont(await fontFromFile(f));
      setNote(`Font ${f.name} dipakai sampai halaman dimuat ulang.`);
    } catch {
      setNote("File font tidak bisa dibaca. Gunakan TTF, OTF, atau WOFF (bukan WOFF2).");
    }
  };

  const phoneApps = [...others.slice(0, 7), spec];

  return (
    <div className="page logo-maker">
      <header className="page-head">
        <div>
          <h1>Buat logo app</h1>
          <p>
            Isi nama, pilih piktogram dan warna. Kotak, tata letak, dan hurufnya mengikuti keluarga logo Product, jadi setiap
            app baru langsung seragam dengan Freelance, Knowledge, Momentum, dan Track.
          </p>
        </div>
        <div className="page-tools">
          <button type="button" className="btn" onClick={reset}>
            Logo baru
          </button>
          <button type="button" className="btn" disabled={!canSave} onClick={save}>
            Simpan ke keluarga
          </button>
          <button type="button" className="btn btn-primary" disabled={!canSave || !!busy} onClick={pack}>
            {busy ?? "Unduh paket ZIP"}
          </button>
        </div>
      </header>
      {fromBuiltin && (
        <p className="note">Ini logo yang sudah ada. Perubahan disimpan sebagai logo baru, logo aslinya tidak berubah.</p>
      )}
      {note && <p className="note">{note}</p>}

      <div className="lm-layout">
        <aside className="panel lm-form">
          <Section n={1} title="Nama">
            <div className="lm-names">
              <label className="field">
                <span>Keluarga</span>
                <input className="text-input" value={spec.family} maxLength={16} onChange={(e) => patch({ family: e.target.value })} />
              </label>
              <label className="field">
                <span>Nama app</span>
                <input
                  className="text-input"
                  value={spec.name}
                  maxLength={22}
                  placeholder="mis. Insight"
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>
                Fungsi singkat <em>untuk saran piktogram dan brief Claude</em>
              </span>
              <input
                className="text-input"
                value={spec.desc ?? ""}
                maxLength={80}
                placeholder="mis. pelacakan tugas tim"
                onChange={(e) => patch({ desc: e.target.value })}
              />
            </label>
            {missing.length > 0 && <p className="warn">Huruf ini tidak ada di font: {missing.join(" ")}</p>}
            {spec.name.length > 12 && <p className="hint">Nama panjang: pakai versi satu baris untuk header yang sempit.</p>}
          </Section>

          <Section n={2} title="Piktogram">
            {kit.lucide && <PictoPicker spec={spec} lucide={kit.lucide} onPick={(picto) => patch({ picto })} />}
          </Section>

          <Section n={3} title="Warna">
            <ColorPicker spec={spec} others={others} onChange={(c) => patch(c)} />
          </Section>

          <Section n={4} title="Ikon aplikasi dan font">
            <div className="seg-group" role="group" aria-label="Latar ikon aplikasi">
              {ICON_STYLES.map((s) => (
                <button key={s.id} type="button" className={iconStyle === s.id ? "on" : ""} aria-pressed={iconStyle === s.id} onClick={() => setIconStyle(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="hint-line">
              Font: <strong>{kit.font.label}</strong>{" "}
              <button type="button" className="link" onClick={() => fontInput.current?.click()}>
                ganti
              </button>
              {kit.font.custom && (
                <>
                  {" · "}
                  <button type="button" className="link" onClick={() => setCustomFont(null)}>
                    kembali ke Gabarito
                  </button>
                </>
              )}
            </p>
            <input
              ref={fontInput}
              type="file"
              accept=".ttf,.otf,.woff"
              hidden
              onChange={(e) => {
                void loadFont(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </Section>
        </aside>

        <section className="lm-preview">
          <div className="lm-hero">
            <ArtCard title="Logo + teks" make={(h) => lockupSvg(spec, kit, "warna", "susun", h)} file={`${file}_logo-teks`} pngHeight={512} />
            <ArtCard
              title="Latar gelap"
              bg="gelap"
              make={(h) => lockupSvg(spec, kit, "gelap", "susun", h)}
              file={`${file}_logo-teks_gelap`}
              pngHeight={512}
            />
          </div>

          <div className="lm-grid">
            <ArtCard title="Logo" make={(h) => markSvg(spec, kit, "warna", { px: h })} file={`${file}_logo`} pngHeight={1024} className="art-square" />
            <ArtCard
              title="Logo, latar gelap"
              bg="gelap"
              make={(h) => markSvg(spec, kit, "gelap", { px: h })}
              file={`${file}_logo_gelap`}
              pngHeight={1024}
              className="art-square"
            />
            <ArtCard title="Hitam" make={(h) => markSvg(spec, kit, "hitam", { px: h })} file={`${file}_logo_hitam`} pngHeight={1024} className="art-square" />
            <ArtCard
              title="Putih"
              stageColor={spec.dark}
              make={(h) => markSvg(spec, kit, "putih", { px: h })}
              file={`${file}_logo_putih`}
              pngHeight={1024}
              className="art-square"
            />
          </div>

          <div className="lm-wide">
            <ArtCard title="Satu baris" make={(h) => lockupSvg(spec, kit, "warna", "baris", h)} file={`${file}_logo-teks-baris`} pngHeight={256} />
            <ArtCard title="Teks saja" make={(h) => wordmarkSvg(spec, kit, "warna", "susun", h)} file={`${file}_teks`} pngHeight={512} />
          </div>

          <div className="panel lm-icons">
            <h2>Ikon aplikasi</h2>
            <div className="icon-row">
              <figure>
                <SvgImg className="ico ico-ios" svg={appIconSvg(spec, kit, { style: iconStyle, shape: "persegi", safe: 0.8 }).svg} alt="Ikon iOS" />
                <figcaption>iOS</figcaption>
              </figure>
              <figure>
                <SvgImg className="ico ico-round" svg={appIconSvg(spec, kit, { style: iconStyle, shape: "persegi", safe: 0.62 }).svg} alt="Ikon Android" />
                <figcaption>Android</figcaption>
              </figure>
              <figure>
                <SvgImg className="ico ico-ios" svg={appIconSvg(spec, kit, { style: iconStyle, shape: "persegi", safe: 0.62 }).svg} alt="Ikon PWA maskable" />
                <figcaption>PWA</figcaption>
              </figure>
              <figure>
                <div className="ico ico-mono">
                  <SvgImg svg={appIconSvg(spec, kit, { style: iconStyle, shape: "tanpa-latar", safe: 0.62, mono: true }).svg} alt="Ikon tema Android" />
                </div>
                <figcaption>Tema Android 13+</figcaption>
              </figure>
              <figure className="fav">
                <div className="fav-sizes">
                  {[16, 32, 48].map((px) => (
                    <SvgImg key={px} svg={markSvg(spec, kit, "warna", { small: true, px }).svg} alt={`Favicon ${px} px`} style={{ width: px, height: px }} />
                  ))}
                </div>
                <div className="fav-sizes fav-dark">
                  {[16, 32, 48].map((px) => (
                    <SvgImg key={px} svg={markSvg(spec, kit, "gelap", { small: true, px }).svg} alt={`Favicon gelap ${px} px`} style={{ width: px, height: px }} />
                  ))}
                </div>
                <figcaption>Favicon 16 · 32 · 48 px (ukuran asli)</figcaption>
              </figure>
            </div>
          </div>

          <div className="panel lm-context">
            <h2>Dalam konteks</h2>
            <div className="ctx-row">
              <div className="ctx-phone" aria-label="Layar ponsel dengan ikon keluarga app">
                {phoneApps.map((a) => (
                  <div key={a.id || "baru"} className={`ctx-app${a === spec ? " me" : ""}`}>
                    <SvgImg svg={appIconSvg(a, kit, { style: iconStyle, shape: "persegi", safe: 0.8 }).svg} alt="" />
                    <span>{a.name || "Nama"}</span>
                  </div>
                ))}
              </div>
              <div className="ctx-stack">
                <div className="ctx-tab">
                  <SvgImg svg={faviconSvg(spec, kit)} alt="" />
                  <span>
                    {spec.family} {spec.name}
                  </span>
                  <i>×</i>
                </div>
                <div className="ctx-header">
                  <SvgImg svg={lockupSvg(spec, kit, "warna", "baris").svg} alt="" />
                  <nav>
                    <span>Beranda</span>
                    <span>Laporan</span>
                    <span>Tim</span>
                  </nav>
                </div>
                <div className="ctx-header ctx-dark">
                  <SvgImg svg={lockupSvg(spec, kit, "gelap", "baris").svg} alt="" />
                  <nav>
                    <span>Beranda</span>
                    <span>Laporan</span>
                    <span>Tim</span>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
