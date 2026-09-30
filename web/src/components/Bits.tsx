import { forwardRef, useEffect, useState } from "react";
import { isHex, normHex } from "../lib/color";
import type { Brand } from "../lib/types";

export function Swatches({ brand, size = 12 }: { brand: Brand; size?: number }) {
  const colors = [brand.roles.primary, brand.roles.accent, brand.roles.primary_shade, brand.roles.light];
  return (
    <span className="swatches" aria-hidden>
      {colors.map((c, i) => (
        <span key={i} style={{ background: c, width: size, height: size }} />
      ))}
    </span>
  );
}

const KIND_TEXT = { v2: "v2", resmi: "resmi", generate: "generate" } as const;

/** Small label: new v2 drawing, official v1 icon, or v1 made by the generator. */
export function KindLabel({ kind }: { kind: keyof typeof KIND_TEXT }) {
  return <span className={`kind kind-${kind}`}>{KIND_TEXT[kind]}</span>;
}

export function BrandSelect({
  brands,
  selected,
  onSelect,
  label = "Brand",
  className = "",
}: {
  brands: Brand[];
  selected: string;
  onSelect: (slug: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      <select value={selected} onChange={(e) => onSelect(e.target.value)}>
        {brands.map((b) => (
          <option key={b.slug} value={b.slug}>
            {b.name}
            {b.custom ? " (brand baru)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Color picker + hex text box. Empty value = derived automatically (placeholder shows it). */
export function ColorField({
  label,
  value,
  placeholder,
  onChange,
  optional = false,
}: {
  label: string;
  value: string | undefined;
  placeholder?: string;
  onChange: (v: string | undefined) => void;
  optional?: boolean;
}) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => setText(value ?? ""), [value]);
  const shown = value ?? placeholder ?? "#000000";
  return (
    <div className="field color-field">
      <span>
        {label}
        {optional && <em> opsional</em>}
      </span>
      <div className="color-row">
        <input
          type="color"
          aria-label={`${label}, pemilih warna`}
          value={isHex(shown) ? normHex(shown).toLowerCase() : "#000000"}
          onChange={(e) => onChange(normHex(e.target.value))}
        />
        <input
          type="text"
          spellCheck={false}
          aria-label={`${label}, kode hex`}
          placeholder={placeholder ? `otomatis ${placeholder}` : "#RRGGBB"}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            setText(v);
            if (!v.trim() && optional) onChange(undefined);
            else if (isHex(v)) onChange(normHex(v));
          }}
        />
        {optional && value && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(undefined)}>
            otomatis
          </button>
        )}
      </div>
    </div>
  );
}

/** Search box that reports the typed text after a short pause; "/" anywhere focuses it. */
export const SearchBox = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; placeholder: string; onEnter?: () => void }
>(function SearchBox({ value, onChange, placeholder, onEnter }, ref) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  useEffect(() => {
    if (text === value) return;
    const t = window.setTimeout(() => onChange(text), 140);
    return () => window.clearTimeout(t);
  }, [text, value, onChange]);
  return (
    <div className="search">
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={ref}
        type="search"
        aria-label="Cari icon"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(text);
            onEnter?.();
          }
          if (e.key === "Escape") setText("");
        }}
      />
      {text && (
        <button type="button" className="search-clear" aria-label="Hapus pencarian" onClick={() => setText("")}>
          ×
        </button>
      )}
      <kbd className="search-kbd" aria-hidden>
        /
      </kbd>
    </div>
  );
});
