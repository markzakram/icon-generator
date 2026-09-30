import { displayName, iconKind } from "../lib/render";
import type { Brand, Glyph, Version } from "../lib/types";
import { useData } from "../state";
import { KindLabel } from "./Bits";
import { IconView } from "./IconView";

/** A grid card: click selects it; the corner button adds it to (or removes it from) the download list. */
export function GlyphCard({
  glyph,
  brand,
  version,
  selected,
  onSelect,
}: {
  glyph: Glyph;
  brand: Brand;
  version: Version;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const { inTray, toggleTray } = useData();
  const picked = inTray(glyph.id);
  const name = displayName(glyph, version);
  return (
    <div className={`card${selected ? " selected" : ""}${picked ? " picked" : ""}`}>
      <button type="button" className="card-main" aria-pressed={selected} onClick={() => onSelect(glyph.id)}>
        <IconView glyph={glyph} brand={brand} size={76} version={version} />
        <span className="card-name">{name}</span>
        <KindLabel kind={iconKind(glyph, brand, version)} />
      </button>
      <button
        type="button"
        className="card-add"
        aria-label={picked ? `Hapus ${name} dari daftar unduhan` : `Tambah ${name} ke daftar unduhan`}
        aria-pressed={picked}
        title={picked ? "Hapus dari daftar unduhan" : "Tambah ke daftar unduhan"}
        onClick={() => toggleTray({ id: glyph.id })}
      >
        {picked ? "✓" : "+"}
      </button>
    </div>
  );
}
