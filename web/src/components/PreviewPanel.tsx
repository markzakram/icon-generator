import { useEffect, useState } from "react";
import { copyImage, copyText, downloadBlob, downloadText } from "../lib/download";
import { displayName, effectiveVersion, hasV2, iconKind, renderIconAt, sourceFor, toBlob, v2SvgFor } from "../lib/render";
import { CATEGORY_LABELS, type Brand, type Glyph, type Version } from "../lib/types";
import { BADGE_OPTIONS, BADGE_TEXT_MAX, badgeFileSuffix, badgeKey, type Badge, type BadgeKind } from "../lib/v2/badges";
import { ALL_PRESETS, buildZip, fileBase, UMUM_SIZES } from "../lib/zip";
import { useData } from "../state";
import { KindLabel } from "./Bits";
import { IconView } from "./IconView";

type Bg = "checker" | "light" | "dark";

export function PreviewPanel({ glyph, brand, onClose }: { glyph: Glyph; brand: Brand; onClose?: () => void }) {
  const { roles, version: globalVersion, toggleTray, tray, pushRecent } = useData();
  const [version, setVersion] = useState<Version>(globalVersion);
  const [force, setForce] = useState(false);
  const [bg, setBg] = useState<Bg>("checker");
  const [badgeKind, setBadgeKind] = useState<BadgeKind | "none">("none");
  const [badgeText, setBadgeText] = useState("2026");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setVersion(globalVersion);
    setForce(false);
    setNote(null);
  }, [glyph.id, brand.slug, globalVersion]);

  const badge: Badge | null =
    badgeKind === "none" ? null : badgeKind === "teks" ? { kind: "teks", text: badgeText } : { kind: badgeKind };
  const v = effectiveVersion(glyph, version);
  const kind = iconKind(glyph, brand, version, force);
  const hasOfficial = sourceFor(glyph, brand) === "resmi";
  const trayItem = tray.find((t) => t.id === glyph.id);
  const sameInTray = !!trayItem && badgeKey(trayItem.badge) === badgeKey(badge);
  const conf = roles[glyph.id]?.conf[brand.custom ? (brand.styleRef ?? "") : brand.slug] ?? [];
  const unsure = kind === "generate" && !brand.custom ? conf.filter((c) => c < 0.5).length : 0;
  const name = fileBase(brand, glyph, badge);

  async function run(label: string, job: () => Promise<string | void>) {
    setBusy(label);
    setNote(null);
    try {
      const msg = await job();
      if (msg) setNote(msg);
      pushRecent(glyph.id);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  const opts = { version, force, badge };
  const downloadPng = (px: number) =>
    run(`png-${px}`, async () => {
      downloadBlob(await toBlob(await renderIconAt(glyph, brand, roles, px, opts)), `${name}_${px}.png`);
    });
  const copyPng = () =>
    run("copy", async () => {
      const ok = await copyImage(await toBlob(await renderIconAt(glyph, brand, roles, 512, opts)));
      return ok ? "Gambar 512 px disalin. Tempel di Figma, Slides, atau chat." : "Browser ini tidak mengizinkan salin gambar.";
    });
  const svgText = v === "v2" ? v2SvgFor(glyph, brand, badge, 96, false) : null;
  const downloadPack = () =>
    run("zip", async () => {
      const blob = await buildZip({ brand, items: [{ glyph, badge }], roles, presets: ALL_PRESETS, base: 64, version, force });
      downloadBlob(blob, `${name}.zip`);
    });

  let text: string;
  if (kind === "v2") text = "Icon v2: digambar ulang sebagai vektor, warnanya diturunkan dari token brand.";
  else if (kind === "resmi") text = `Icon resmi ${brand.name} (v1), dirapikan ke canvas persegi.`;
  else if (brand.custom) text = "Icon v1 dibuat otomatis mengikuti gaya referensi brand ini.";
  else if (hasOfficial) text = "Versi generate v1, untuk dibandingkan dengan icon resmi.";
  else text = `${brand.name} belum punya icon v1 ini; dibuat otomatis dari ${glyph.brandCount} brand lain.`;

  return (
    <aside className={`panel preview${onClose ? " explicit" : ""}`} aria-label="Preview icon">
      <div className="preview-top">
        <div className="seg-group" role="group" aria-label="Latar">
          {(["checker", "light", "dark"] as Bg[]).map((b) => (
            <button key={b} type="button" className={bg === b ? "on" : ""} aria-pressed={bg === b} onClick={() => setBg(b)}>
              {b === "checker" ? "Transparan" : b === "light" ? "Terang" : "Gelap"}
            </button>
          ))}
        </div>
        {onClose && (
          <button type="button" className="icon-btn" aria-label="Tutup preview" onClick={onClose}>
            ×
          </button>
        )}
      </div>
      <div className={`stage bg-${bg}`}>
        <IconView glyph={glyph} brand={brand} size={216} version={version} force={force} badge={badge} thumb={false} />
      </div>

      <div className="preview-head">
        <h2>{displayName(glyph, version)}</h2>
        <KindLabel kind={kind} />
      </div>
      <p className="meta">
        <code>{glyph.id}</code> · {CATEGORY_LABELS[glyph.kategori] ?? glyph.kategori}
      </p>
      <p className="note">{text}</p>

      {(hasV2(glyph) || (v === "v1" && hasOfficial)) && (
        <div className="row-opts">
          {hasV2(glyph) && (
            <div className="seg-group" role="group" aria-label="Versi icon ini">
              {(["v2", "v1"] as Version[]).map((x) => (
                <button key={x} type="button" className={version === x ? "on" : ""} aria-pressed={version === x} onClick={() => setVersion(x)}>
                  {x === "v2" ? "v2 baru" : "v1 lama"}
                </button>
              ))}
            </div>
          )}
          {v === "v1" && hasOfficial && (
            <label className="toggle">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
              <span>Versi generate</span>
            </label>
          )}
        </div>
      )}
      {unsure > 0 && <p className="warn">{unsure} bagian warnanya kurang yakin; cek di Bandingkan sebelum dipakai.</p>}

      <div className="block">
        <span className="label">Lencana</span>
        <div className="chips chips-sm">
          {BADGE_OPTIONS.map((o) => (
            <button
              key={o.kind}
              type="button"
              className={`chip${badgeKind === o.kind ? " on" : ""}`}
              aria-pressed={badgeKind === o.kind}
              onClick={() => setBadgeKind(o.kind)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {badgeKind === "teks" && (
          <input
            className="text-input"
            value={badgeText}
            maxLength={BADGE_TEXT_MAX}
            aria-label="Teks lencana"
            placeholder="2026"
            onChange={(e) => setBadgeText(e.target.value)}
          />
        )}
      </div>

      <div className="block">
        <span className="label">Unduh PNG</span>
        <div className="btn-row">
          {UMUM_SIZES.map((px) => (
            <button key={px} type="button" className="btn" disabled={!!busy} onClick={() => downloadPng(px)}>
              {busy === `png-${px}` ? "…" : px}
            </button>
          ))}
        </div>
        <div className="btn-row-2">
          <button type="button" className="btn" disabled={!!busy} onClick={copyPng}>
            Salin gambar
          </button>
          {svgText && (
            <>
              <button type="button" className="btn" onClick={() => downloadText(svgText, `${name}.svg`, "image/svg+xml")}>
                Unduh SVG
              </button>
              <button
                type="button"
                className="btn"
                onClick={async () => setNote((await copyText(svgText)) ? "SVG disalin." : "Browser ini tidak mengizinkan salin teks.")}
              >
                Salin SVG
              </button>
            </>
          )}
        </div>
        <button type="button" className="btn btn-block" disabled={!!busy} onClick={downloadPack}>
          {busy === "zip" ? "Menyiapkan paket…" : "Paket Android, iOS, Web (.zip)"}
        </button>
        <button
          type="button"
          className={`btn btn-block ${sameInTray ? "" : "btn-primary"}`}
          onClick={() => toggleTray({ id: glyph.id, badge })}
        >
          {sameInTray ? "Hapus dari daftar unduhan" : trayItem ? "Perbarui lencana di daftar" : "Tambah ke daftar unduhan"}
        </button>
        <p className="filename">
          Nama file: <code>{`${name}_512.png`}</code>
          {badge ? ` · lencana ${badgeFileSuffix(badge).slice(1)}` : ""}
        </p>
        {note && <p className="note">{note}</p>}
      </div>

      <div className="block">
        <span className="label">Kata kunci pencarian</span>
        <div className="tags">
          {[...new Set([...glyph.alias, ...glyph.sinonim])].slice(0, 12).map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}
