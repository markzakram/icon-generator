/** Where a logo's pictogram comes from. */
export type PictoRef =
  | { kind: "bawaan"; id: string }
  | { kind: "lucide"; id: string }
  | { kind: "custom"; svg: string; name?: string };

/** One product app logo: everything needed to redraw it exactly. */
export interface LogoSpec {
  /** File-safe id, e.g. "product_insight". */
  id: string;
  /** Family word shown first, "Product" for the current apps. */
  family: string;
  /** App name, e.g. "Knowledge". */
  name: string;
  /** Box faces and the family word. */
  dark: string;
  /** Panel, pictogram, and the app name. */
  bright: string;
  picto: PictoRef;
  /** What the app does, in a few words: drives pictogram suggestions and the Claude brief. */
  desc?: string;
  /** One of the four logos that already exist (read-only in the family view). */
  builtin?: boolean;
  updated?: number;
}

/** Color scheme of one rendering: full color on light, for dark backgrounds, or single color. */
export type Scheme = "warna" | "gelap" | "hitam" | "putih";

export type Layout = "susun" | "baris";

/** Colors after the scheme is applied. */
export interface Paint {
  face: string;
  panel: string;
  /** Pictogram main color. */
  pb: string;
  /** Pictogram second color (details drawn in the dark color). */
  pd: string;
  family: string;
  name: string;
}
