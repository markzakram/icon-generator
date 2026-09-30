import { useState } from "react";
import { contrast, isHex, normHex } from "../../lib/color";
import { deriveDark, nearestHue, rankSwatches } from "../../lib/logo/palette";
import type { LogoSpec } from "../../lib/logo/types";

function HexInput({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const [text, setText] = useState(value);
  const [last, setLast] = useState(value);
  if (value !== last) {
    setLast(value);
    setText(value);
  }
  return (
    <label className="field hex-field">
      <span>{label}</span>
      <div className="hex-row">
        <input type="color" value={value} aria-label={`${label} (pemilih warna)`} onChange={(e) => onChange(normHex(e.target.value))} />
        <input
          className="text-input"
          value={text}
          spellCheck={false}
          maxLength={7}
          aria-label={`${label} (hex)`}
          onChange={(e) => {
            setText(e.target.value);
            if (isHex(e.target.value)) onChange(normHex(e.target.value));
          }}
        />
      </div>
    </label>
  );
}

/**
 * Color pair picker. Swatches are ordered by how different they are from the colors other
 * apps in the family already use, so a new app is easy to tell apart.
 */
export function ColorPicker({
  spec,
  others,
  onChange,
}: {
  spec: LogoSpec;
  others: LogoSpec[];
  onChange: (c: { bright: string; dark: string }) => void;
}) {
  const [auto, setAuto] = useState(true);
  const used = others.map((o) => o.bright);
  const swatches = rankSwatches(used);
  const near = others.length ? nearestHue(spec.bright, used) : null;
  const similar = near && near.diff < 22 ? others[near.index] : null;
  const onWhite = contrast(spec.bright, "#FFFFFF");

  const usedBy = (bright: string) => others.find((o) => o.bright.toUpperCase() === bright.toUpperCase());

  return (
    <div className="color-picker">
      <div className="swatch-grid" role="radiogroup" aria-label="Pasangan warna">
        {swatches.map((s) => {
          const owner = usedBy(s.bright);
          const on = s.bright.toUpperCase() === spec.bright.toUpperCase() && s.dark.toUpperCase() === spec.dark.toUpperCase();
          return (
            <button
              key={s.nama}
              type="button"
              role="radio"
              aria-checked={on}
              className={`swatch-pair${on ? " on" : ""}${owner ? " used" : ""}`}
              title={owner ? `${s.nama}: dipakai ${owner.family} ${owner.name}` : s.nama}
              onClick={() => onChange({ bright: s.bright, dark: s.dark })}
            >
              <span className="sp-chip">
                <i style={{ background: s.dark }} />
                <i style={{ background: s.bright }} />
              </span>
              <span className="sp-name">{s.nama}</span>
              {owner && <em>{owner.name}</em>}
            </button>
          );
        })}
      </div>

      <div className="two">
        <HexInput
          label="Warna terang"
          value={spec.bright}
          onChange={(bright) => onChange({ bright, dark: auto ? deriveDark(bright) : spec.dark })}
        />
        <HexInput
          label="Warna gelap"
          value={spec.dark}
          onChange={(dark) => {
            setAuto(false);
            onChange({ bright: spec.bright, dark });
          }}
        />
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => {
            setAuto(e.target.checked);
            if (e.target.checked) onChange({ bright: spec.bright, dark: deriveDark(spec.bright) });
          }}
        />
        Warna gelap dihitung otomatis dari warna terang
      </label>

      {similar && (
        <p className="warn">
          Warnanya mirip {similar.family} {similar.name}. Pilih warna di urutan atas supaya aplikasi mudah dibedakan.
        </p>
      )}
      {onWhite < 2 && (
        <p className="warn">
          Nama app agak pucat di latar putih (kontras {onWhite.toFixed(1)}:1). Geser warna terang sedikit lebih gelap.
        </p>
      )}
    </div>
  );
}
