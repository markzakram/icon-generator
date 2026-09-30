import { useMemo, useState } from "react";
import { copyText } from "../../lib/download";
import {
  BUILTIN_PICTOS,
  claudeBrief,
  flatPictoSvg,
  parseCustomSvg,
  pictoLabel,
  POPULAR,
  sameRef,
  searchPictos,
  suggestPictos,
  type LucideSet,
} from "../../lib/logo/picto";
import type { LogoSpec, PictoRef } from "../../lib/logo/types";
import { SvgImg } from "../SvgImg";

function Tile({
  ref_,
  spec,
  lucide,
  on,
  onPick,
}: {
  ref_: PictoRef;
  spec: LogoSpec;
  lucide: LucideSet;
  on: boolean;
  onPick: (r: PictoRef) => void;
}) {
  const label = pictoLabel(ref_);
  return (
    <button
      type="button"
      className={`picto-tile${on ? " on" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={() => onPick(ref_)}
    >
      <SvgImg svg={flatPictoSvg(ref_, lucide, spec.bright, spec.dark)} alt="" />
    </button>
  );
}

export function PictoPicker({
  spec,
  lucide,
  onPick,
}: {
  spec: LogoSpec;
  lucide: LucideSet;
  onPick: (r: PictoRef) => void;
}) {
  const [query, setQuery] = useState("");
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(spec.picto.kind === "custom");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  const { name, desc } = spec;
  const suggestions = useMemo(() => suggestPictos({ name, desc }, lucide), [name, desc, lucide]);
  const results = useMemo(() => searchPictos(query, lucide), [query, lucide]);
  const defaults: PictoRef[] = useMemo(
    () => [
      ...BUILTIN_PICTOS.map((p) => ({ kind: "bawaan" as const, id: p.id })),
      ...POPULAR.filter((id) => lucide.markup.has(id)).map((id) => ({ kind: "lucide" as const, id })),
    ],
    [lucide],
  );

  const tiles = (list: PictoRef[]) => (
    <div className="picto-grid">
      {list.map((r) => (
        <Tile
          key={r.kind === "custom" ? "custom" : `${r.kind}:${r.id}`}
          ref_={r}
          spec={spec}
          lucide={lucide}
          on={sameRef(r, spec.picto)}
          onPick={onPick}
        />
      ))}
    </div>
  );

  const usePaste = () => {
    try {
      const p = parseCustomSvg(paste);
      onPick({ kind: "custom", svg: p.svg, name: "SVG sendiri" });
      setMsg({ text: `Dipakai: ${p.elements} bentuk, ${p.colors} warna.` });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : String(e), bad: true });
    }
  };

  const askClaude = async () => {
    const ok = await copyText(claudeBrief(spec));
    setShowPaste(true);
    setMsg({
      text: ok
        ? "Brief disalin. Tempel ke Claude, pilih satu SVG dari jawabannya, lalu tempel di kotak di bawah."
        : "Browser menolak menyalin otomatis. Buka Panduan logo untuk menyalin brief secara manual.",
      bad: !ok,
    });
  };

  return (
    <div className="picto-picker">
      <div className="picto-current">
        <Tile ref_={spec.picto} spec={spec} lucide={lucide} on onPick={() => undefined} />
        <div>
          <strong>{pictoLabel(spec.picto)}</strong>
          <span>{spec.picto.kind === "lucide" ? "Lucide" : spec.picto.kind === "bawaan" ? "Piktogram produk" : "SVG sendiri"}</span>
        </div>
      </div>

      {suggestions.length > 0 && (
        <>
          <p className="picto-sub">Saran untuk “{spec.name || "nama app"}”</p>
          {tiles(suggestions)}
        </>
      )}

      <input
        className="text-input"
        type="search"
        value={query}
        placeholder="Cari piktogram: jadwal, chart, tim, keamanan…"
        aria-label="Cari piktogram"
        onChange={(e) => setQuery(e.target.value)}
      />
      {query.trim() ? (
        results.length ? (
          tiles(results)
        ) : (
          <p className="hint">Tidak ada hasil. Coba kata dalam bahasa Inggris, atau minta Claude membuatkannya.</p>
        )
      ) : (
        <>
          <p className="picto-sub">Piktogram produk dan yang sering dipakai</p>
          {tiles(defaults)}
        </>
      )}

      <div className="picto-custom">
        <button type="button" className="btn btn-sm" onClick={askClaude}>
          Minta Claude
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowPaste((s) => !s)} aria-expanded={showPaste}>
          Tempel SVG sendiri
        </button>
      </div>
      {showPaste && (
        <div className="picto-paste">
          <textarea
            className="text-input"
            rows={4}
            value={paste}
            placeholder='<svg viewBox="0 0 24 24" …>…</svg>'
            aria-label="Kode SVG piktogram"
            onChange={(e) => setPaste(e.target.value)}
          />
          <button type="button" className="btn btn-sm btn-primary" disabled={!paste.trim()} onClick={usePaste}>
            Pakai SVG ini
          </button>
        </div>
      )}
      {msg && <p className={msg.bad ? "error" : "note"}>{msg.text}</p>}
    </div>
  );
}
