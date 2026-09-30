import { useEffect, useState } from "react";

export type Screen = "generator" | "bandingkan" | "brand-baru" | "export";

const SCREENS: Screen[] = ["generator", "bandingkan", "brand-baru", "export"];

export interface Route {
  screen: Screen;
  params: URLSearchParams;
}

export function parseHash(hash = window.location.hash): Route {
  const h = hash.replace(/^#\/?/, "");
  const [path, query = ""] = h.split("?");
  const screen = (SCREENS as string[]).includes(path) ? (path as Screen) : "generator";
  return { screen, params: new URLSearchParams(query) };
}

export function hrefFor(screen: Screen, params?: Record<string, string | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v) p.set(k, v);
  const q = p.toString();
  return `#/${screen}${q ? `?${q}` : ""}`;
}

/** Push a new screen (adds a history entry). */
export function go(screen: Screen, params?: Record<string, string | undefined | null>): void {
  window.location.hash = hrefFor(screen, params);
}

/** Update the current screen's parameters without adding history (e.g. while typing). */
export function replaceParams(screen: Screen, params: Record<string, string | undefined | null>): void {
  const href = hrefFor(screen, params);
  if (href === window.location.hash) return;
  window.history.replaceState(null, "", href);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash());
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
