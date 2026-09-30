import { lazy, Suspense } from "react";
import { Header } from "./components/Header";
import { useRoute } from "./lib/route";
import { Compare } from "./screens/Compare";
import { Export } from "./screens/Export";
import { Generator } from "./screens/Generator";
import { Guide } from "./screens/Guide";
import { NewBrand } from "./screens/NewBrand";
import { Test5 } from "./screens/Test5";

// the logo workspace pulls in the font engine and pictogram library: load it only when opened
const LogoMaker = lazy(() => import("./screens/LogoMaker").then((m) => ({ default: m.LogoMaker })));
const LogoFamily = lazy(() => import("./screens/LogoFamily").then((m) => ({ default: m.LogoFamily })));
const LogoGuide = lazy(() => import("./screens/LogoGuide").then((m) => ({ default: m.LogoGuide })));

function Loading() {
  return (
    <div className="fullscreen">
      <div className="spinner" aria-hidden />
    </div>
  );
}

export default function App() {
  const route = useRoute();
  return (
    <div className="app">
      <Header screen={route.screen} />
      <main>
        {route.screen === "generator" && <Generator params={route.params} />}
        {route.screen === "export" && <Export params={route.params} />}
        {route.screen === "brand-baru" && <NewBrand params={route.params} />}
        {route.screen === "bandingkan" && <Compare params={route.params} />}
        {route.screen === "uji" && <Test5 />}
        {route.screen === "panduan" && <Guide />}
        <Suspense fallback={<Loading />}>
          {route.screen === "logo" && <LogoMaker params={route.params} />}
          {route.screen === "logo-keluarga" && <LogoFamily />}
          {route.screen === "logo-panduan" && <LogoGuide />}
        </Suspense>
      </main>
    </div>
  );
}
