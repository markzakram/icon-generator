import { completeRoles, isHex, normHex } from "./color";
import { ROLE_NAMES, type Brand, type Roles } from "./types";

const KEY = "icon-generator.custom-brands.v1";

export function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s || "brand_baru";
}

export function makeCustomBrand(name: string, given: Partial<Roles> & { primary: string }, styleRef: string): Brand {
  const clean: Partial<Roles> = {};
  for (const r of ROLE_NAMES) {
    const v = given[r];
    if (v && isHex(v)) clean[r] = normHex(v);
  }
  return {
    name: name.trim() || "Brand baru",
    slug: slugify(name),
    roles: completeRoles({ ...clean, primary: clean.primary ?? "#482171" }),
    given: clean,
    official: 0,
    custom: true,
    styleRef,
  };
}

interface Stored {
  name: string;
  given: Partial<Roles> & { primary: string };
  styleRef: string;
}

export function loadCustomBrands(): Brand[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Stored[]).map((s) => makeCustomBrand(s.name, s.given, s.styleRef));
  } catch {
    return [];
  }
}

export function saveCustomBrands(brands: Brand[]): void {
  try {
    const data: Stored[] = brands.map((b) => ({
      name: b.name,
      given: { ...b.given, primary: b.roles.primary },
      styleRef: b.styleRef ?? "jadipcpm",
    }));
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable (private window): custom brands live for this visit only */
  }
}

/** A custom brand as link parameters, so it can be shared without a server. */
export function brandToParams(b: Brand): Record<string, string> {
  const p: Record<string, string> = { nama: b.name, ref: b.styleRef ?? "jadipcpm" };
  for (const r of ROLE_NAMES) {
    const v = b.given[r];
    if (v) p[r] = v.replace("#", "");
  }
  return p;
}

export function brandFromParams(p: URLSearchParams): Brand | null {
  const primary = p.get("primary");
  if (!primary || !isHex(primary)) return null;
  const given: Partial<Roles> & { primary: string } = { primary: normHex(primary) };
  for (const r of ROLE_NAMES) {
    const v = p.get(r);
    if (v && isHex(v)) given[r] = normHex(v);
  }
  return makeCustomBrand(p.get("nama") ?? "Brand baru", given, p.get("ref") ?? "jadipcpm");
}

/** Same shape as an entry of catalog/brands.json, ready for a developer to add. */
export function brandJson(b: Brand): string {
  const roles: Record<string, string | null> = {};
  for (const r of ROLE_NAMES) roles[r] = b.given[r] ?? null;
  return JSON.stringify(
    { [b.name]: { slug: b.slug, gaya_referensi: b.styleRef, roles, roles_lengkap: b.roles } },
    null,
    1,
  );
}
