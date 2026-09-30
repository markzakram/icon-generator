import { useState } from "react";
import { downloadBlob } from "../lib/download";
import { hrefFor } from "../lib/route";
import { ALL_PRESETS, buildZip } from "../lib/zip";
import { useData } from "../state";
import { IconView } from "./IconView";

/** Sticky bar with the icons collected for one download. */
export function Tray({ onSelect }: { onSelect?: (id: string) => void }) {
  const { tray, clearTray, toggleTray, glyphById, brand, roles, version } = useData();
  const [progress, setProgress] = useState<string | null>(null);
  const items = tray.map((t) => ({ glyph: glyphById.get(t.id), badge: t.badge })).filter((t) => t.glyph);
  if (!items.length) return null;

  async function download() {
    setProgress(`0/${items.length}`);
    try {
      const blob = await buildZip({
        brand,
        items: items.map((t) => ({ glyph: t.glyph!, badge: t.badge })),
        roles,
        presets: ALL_PRESETS,
        base: 64,
        version,
        onProgress: (d, n) => setProgress(`${d}/${n}`),
      });
      downloadBlob(blob, `${brand.slug}_icon_pilihan.zip`);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="tray" role="region" aria-label="Daftar unduhan">
      <strong className="tray-count">{items.length} icon</strong>
      <div className="tray-items">
        {items.map((t) => (
          <span key={t.glyph!.id} className="tray-item">
            <button type="button" className="tray-thumb" title={t.glyph!.nama} onClick={() => onSelect?.(t.glyph!.id)}>
              <IconView glyph={t.glyph!} brand={brand} size={34} version={version} badge={t.badge} />
            </button>
            <button
              type="button"
              className="tray-remove"
              aria-label={`Hapus ${t.glyph!.nama}`}
              onClick={() => toggleTray({ id: t.glyph!.id, badge: t.badge })}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="tray-actions">
        <button type="button" className="btn btn-ghost" onClick={clearTray}>
          Kosongkan
        </button>
        <a className="btn" href={hrefFor("export", { sumber: "daftar" })}>
          Atur format
        </a>
        <button type="button" className="btn btn-primary" disabled={!!progress} onClick={download}>
          {progress ? `Menyiapkan ${progress}…` : `Unduh ZIP ${brand.name}`}
        </button>
      </div>
    </div>
  );
}
