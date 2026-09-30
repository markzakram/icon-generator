// Minimal typings for the parts of opentype.js 2.x the logo generator uses (the package ships none).
declare module "opentype.js" {
  export interface BoundingBox {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }

  export interface Path {
    toPathData(decimalPlaces?: number): string;
    getBoundingBox(): BoundingBox;
  }

  export interface Glyph {
    index: number;
    name?: string;
    unicode?: number;
    advanceWidth?: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }

  export interface Font {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    names: Record<string, Record<string, string> | undefined>;
    tables: { os2?: { sCapHeight?: number; sxHeight?: number } } & Record<string, unknown>;
    charToGlyph(char: string): Glyph;
    getKerningValue(left: Glyph | number, right: Glyph | number): number;
  }

  export function parse(buffer: ArrayBuffer): Font;
}
