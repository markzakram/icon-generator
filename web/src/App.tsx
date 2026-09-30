import { Header } from "./components/Header";
import { useRoute } from "./lib/route";
import { Compare } from "./screens/Compare";
import { Export } from "./screens/Export";
import { Generator } from "./screens/Generator";
import { Guide } from "./screens/Guide";
import { NewBrand } from "./screens/NewBrand";
import { Test5 } from "./screens/Test5";

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
      </main>
    </div>
  );
}
