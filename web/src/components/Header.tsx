import { useEffect, useRef, useState } from "react";
import { hrefFor, isLogoScreen, type Screen } from "../lib/route";
import type { Version } from "../lib/types";
import { useData } from "../state";
import { Swatches } from "./Bits";

const NAV: [Screen, string][] = [
  ["generator", "Buat icon"],
  ["export", "Unduh set"],
  ["brand-baru", "Brand baru"],
  ["bandingkan", "Bandingkan"],
  ["uji", "Uji 5 detik"],
  ["panduan", "Panduan v2"],
];

const LOGO_NAV: [Screen, string][] = [
  ["logo", "Buat logo"],
  ["logo-keluarga", "Keluarga logo"],
  ["logo-panduan", "Panduan logo"],
];

function BrandSwitcher() {
  const { brand, builtin, custom, setBrand } = useData();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (slug: string) => {
    setBrand(slug);
    setOpen(false);
  };

  return (
    <div className="switcher" ref={ref}>
      <button
        type="button"
        className="switcher-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Swatches brand={brand} />
        <span className="switcher-name">{brand.name}</span>
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="switcher-menu" role="listbox" aria-label="Pilih brand">
          {[...builtin, ...custom].map((b) => (
            <button
              key={b.slug}
              type="button"
              role="option"
              aria-selected={b.slug === brand.slug}
              className={`switcher-item${b.slug === brand.slug ? " active" : ""}`}
              onClick={() => pick(b.slug)}
            >
              <Swatches brand={b} />
              <span>{b.name}</span>
              <em>{b.custom ? "brand baru" : `${b.official} resmi`}</em>
            </button>
          ))}
          <a className="switcher-add" href={hrefFor("brand-baru")} onClick={() => setOpen(false)}>
            + Buat brand baru
          </a>
        </div>
      )}
    </div>
  );
}

function VersionToggle() {
  const { version, setVersion } = useData();
  const opts: [Version, string][] = [
    ["v2", "Icon v2"],
    ["v1", "v1"],
  ];
  return (
    <div className="version" role="group" aria-label="Versi icon">
      {opts.map(([v, label]) => (
        <button key={v} type="button" className={version === v ? "on" : ""} aria-pressed={version === v} onClick={() => setVersion(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Header({ screen }: { screen: Screen }) {
  const logoMode = isLogoScreen(screen);
  return (
    <header className="topbar">
      <a className="logo" href={hrefFor(logoMode ? "logo" : "generator")}>
        <svg viewBox="0 0 32 32" aria-hidden>
          <path d="M16 3l11 6.5v13L16 29 5 22.5v-13z" fill="#482171" />
          <path d="M16 9l6 3.5v7L16 23l-6-3.5v-7z" fill="#CB0560" />
        </svg>
        <span>{logoMode ? "Logo Generator" : "Icon Generator"}</span>
      </a>
      <div className="workspace" role="group" aria-label="Ruang kerja">
        <a href={hrefFor("generator")} className={logoMode ? "" : "on"} aria-current={logoMode ? undefined : "true"}>
          Icon brand
        </a>
        <a href={hrefFor("logo")} className={logoMode ? "on" : ""} aria-current={logoMode ? "true" : undefined}>
          Logo app
        </a>
      </div>
      <nav aria-label="Menu utama">
        {(logoMode ? LOGO_NAV : NAV).map(([s, label]) => (
          <a key={s} href={hrefFor(s)} className={screen === s ? "active" : ""} aria-current={screen === s ? "page" : undefined}>
            {label}
          </a>
        ))}
      </nav>
      {!logoMode && (
        <div className="topbar-right">
          <VersionToggle />
          <BrandSwitcher />
        </div>
      )}
    </header>
  );
}
