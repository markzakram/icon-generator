import { hrefFor, useRoute, type Screen } from "./lib/route";
import { Compare } from "./screens/Compare";
import { Export } from "./screens/Export";
import { Generator } from "./screens/Generator";
import { NewBrand } from "./screens/NewBrand";
import { useData } from "./state";

const NAV: [Screen, string][] = [
  ["generator", "Generator"],
  ["bandingkan", "Bandingkan"],
  ["brand-baru", "Brand baru"],
  ["export", "Export"],
];

export default function App() {
  const route = useRoute();
  const { glyphs, builtin } = useData();
  return (
    <div className="app">
      <header className="topbar">
        <a className="logo" href={hrefFor("generator")}>
          <svg viewBox="0 0 32 32" aria-hidden>
            <path d="M16 3l11 6.5v13L16 29 5 22.5v-13z" fill="#482171" />
            <path d="M16 9l6 3.5v7L16 23l-6-3.5v-7z" fill="#CB0560" />
          </svg>
          <span>Icon Generator</span>
        </a>
        <nav aria-label="Menu utama">
          {NAV.map(([s, label]) => (
            <a key={s} href={hrefFor(s)} className={route.screen === s ? "active" : ""} aria-current={route.screen === s ? "page" : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <span className="stats">
          {glyphs.length} glyph · {builtin.length} brand
        </span>
      </header>
      <main>
        {route.screen === "generator" && <Generator params={route.params} />}
        {route.screen === "bandingkan" && <Compare params={route.params} />}
        {route.screen === "brand-baru" && <NewBrand params={route.params} />}
        {route.screen === "export" && <Export params={route.params} />}
      </main>
    </div>
  );
}
