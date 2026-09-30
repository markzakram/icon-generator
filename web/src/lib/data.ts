import type { Catalog, RolesData } from "./types";

const BASE = import.meta.env.BASE_URL;

export const dataUrl = (p: string) => `${BASE}data/${p}`;

export async function loadAll(): Promise<{ catalog: Catalog; roles: RolesData }> {
  const [c, r] = await Promise.all([fetch(dataUrl("catalog.json")), fetch(dataUrl("roles.json"))]);
  if (!c.ok || !r.ok) {
    throw new Error("Data icon belum diekspor. Jalankan: python pipeline/export_web.py");
  }
  return { catalog: (await c.json()) as Catalog, roles: (await r.json()) as RolesData };
}
