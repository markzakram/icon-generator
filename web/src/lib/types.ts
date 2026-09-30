export const ROLE_NAMES = [
  "primary",
  "primary_shade",
  "primary_alt",
  "accent",
  "accent_shade",
  "light",
  "light_alt",
  "dark",
] as const;

export type RoleName = (typeof ROLE_NAMES)[number];
export type Roles = Record<RoleName, string>;

export interface Brand {
  name: string;
  slug: string;
  /** Every role filled in (missing ones derived). */
  roles: Roles;
  /** The roles that were actually given. */
  given: Partial<Roles>;
  /** Number of glyphs with an official icon. */
  official: number;
  custom?: boolean;
  /** Slug of the brand whose style a custom brand copies. */
  styleRef?: string;
}

export interface Glyph {
  id: string;
  nama: string;
  kategori: string;
  alias: string[];
  sinonim: string[];
  deskripsi: string;
  /** Slugs of brands that have an official icon for this glyph. */
  official: string[];
  brandCount: number;
}

export interface Catalog {
  version: string;
  size: number;
  thumb: number;
  roleLabels: Record<RoleName, string>;
  fixed: string[];
  standard: string[];
  brands: Brand[];
  similarity: Record<string, Record<string, number>>;
  glyphs: Glyph[];
}

export interface GlyphRoles {
  regions: number;
  /** Role (or fixed "#hex") of every region, as the generator would paint it. */
  predicted: Record<string, string[]>;
  /** Roles read from the brand's own official icon. */
  observed: Record<string, string[]>;
  conf: Record<string, number[]>;
}

export type RolesData = Record<string, GlyphRoles>;

export const CATEGORY_LABELS: Record<string, string> = {
  menu: "Menu",
  subtes: "Subtes",
  mapel: "Mapel",
  profesi_bidang: "Profesi & bidang",
  lembaga: "Lembaga",
  orang: "Orang",
  lainnya: "Lainnya",
};

export const ROLE_LABELS: Record<RoleName, string> = {
  primary: "Primer",
  primary_shade: "Sisi 3D primer",
  primary_alt: "Variasi primer",
  accent: "Aksen",
  accent_shade: "Sisi 3D aksen",
  light: "Terang",
  light_alt: "Terang kedua",
  dark: "Gelap netral",
};
