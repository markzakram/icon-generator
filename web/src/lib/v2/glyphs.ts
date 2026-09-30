/**
 * Icon v2 masters. 96-unit grid, content inside the 80% safe area (about 10..86), 3D side offset
 * (-4, +4) in the deep version of the face color, details at least 4 units thick. Colors are token
 * placeholders ({P}, {PD}, {A}, {AD}, {L}, {LD}, {OP}, {OA}, {OL}, {AX}); see tokens.ts.
 * <g class="fine"> holds details that are dropped at 48 px and below (never nest groups inside it).
 */

export interface V2Glyph {
  /** Catalog glyph id this v2 drawing replaces. */
  id: string;
  /** Display name when it differs from the catalog name. */
  nama?: string;
  svg: string;
}

const FONT = `font-family="Arial, Helvetica, sans-serif" font-weight="700"`;

/** Shared base for the subtest tile family: one tile, one big symbol, accent underline. */
const tile = (symbol: string) =>
  `<rect x="12" y="20" width="68" height="60" rx="12" fill="{PD}"/>` +
  `<rect x="16" y="16" width="68" height="60" rx="12" fill="{P}"/>` +
  symbol +
  `<rect x="33" y="63" width="34" height="5" rx="2.5" fill="{A}"/>`;

const tileText = (text: string, size = 28, y = 53) =>
  tile(`<text x="50" y="${y}" text-anchor="middle" ${FONT} font-size="${size}" fill="{OP}">${text}</text>`);

/** A paper sheet: 3D side + face. */
const sheet = (x: number, y: number, w: number, h: number, rx = 7) =>
  `<rect x="${x - 4}" y="${y + 4}" width="${w}" height="${h}" rx="${rx}" fill="{PD}"/>` +
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="{P}"/>`;

const BUBBLE =
  "M22 12 H74 A8 8 0 0 1 82 20 V56 A8 8 0 0 1 74 64 H42 L28 78 V64 H22 A8 8 0 0 1 14 56 V20 A8 8 0 0 1 22 12 Z";
const DOC = "M26 12 H62 L82 32 V78 A6 6 0 0 1 76 84 H26 A6 6 0 0 1 20 78 V18 A6 6 0 0 1 26 12 Z";
const TAG = "M34 30 H72 A8 8 0 0 1 80 38 V58 A8 8 0 0 1 72 66 H34 L16 48 Z";
const PIN = "M62 10 C49 10 40 19.5 40 32 C40 47 62 68 62 68 C62 68 84 47 84 32 C84 19.5 75 10 62 10 Z";
const CONE = "M26 36 L60 18 A5 5 0 0 1 67 22.5 V73.5 A5 5 0 0 1 60 78 L26 60 Z";
const BULB =
  "M48 8 C32 8 20 20 20 35 C20 45 26 52 32 57 C35 60 36 62 36 65 H60 C60 62 61 60 64 57 C70 52 76 45 76 35 C76 20 64 8 48 8 Z";
const HEAD =
  "M34 84 V70 C22 64 18 50 20 40 C22 22 38 12 54 12 C70 12 80 24 80 38 C80 44 79 47 79 49 L85 59 L79 61 V69 C79 73 76 75 72 75 H63 V84 Z";
const ARCS = `<path d="M33.9 33.9 A20 20 0 0 0 33.9 62.1"/><path d="M62.1 33.9 A20 20 0 0 1 62.1 62.1"/><path d="M24 24 A34 34 0 0 0 24 72"/><path d="M72 24 A34 34 0 0 1 72 72"/>`;
const PERSON_SIDE = (cx: number) =>
  `<circle cx="${cx}" cy="37" r="8.5"/><path d="M${cx - 14} 74 V67 A14 14 0 0 1 ${cx} 53 A14 14 0 0 1 ${cx + 14} 67 V74 Z"/>`;
const PERSON_FRONT = `<circle cx="48" cy="30" r="11"/><path d="M30 84 V68 A18 18 0 0 1 48 50 A18 18 0 0 1 66 68 V84 Z"/>`;
const LINKS = (s1: string, s2: string) =>
  `<rect x="14" y="44" width="44" height="22" rx="11" transform="rotate(-45 36 55)" stroke="${s1}"/>` +
  `<rect x="38" y="30" width="44" height="22" rx="11" transform="rotate(-45 60 41)" stroke="${s2}"/>`;

export const V2_GLYPHS: V2Glyph[] = [
  {
    id: "materi",
    svg:
      sheet(18, 14, 52, 64) +
      `<rect x="23" y="65" width="42" height="7" rx="2.5" fill="{L}"/>` +
      `<g class="fine"><rect x="28" y="25" width="30" height="6" rx="3" fill="{OP}"/><rect x="28" y="36" width="20" height="6" rx="3" fill="{OP}"/></g>` +
      `<circle cx="63" cy="66" r="19" fill="{AD}"/><circle cx="67" cy="62" r="19" fill="{A}"/>` +
      `<path d="M62 53.5 L75.5 62 L62 70.5 Z" fill="{OA}" stroke="{OA}" stroke-width="3" stroke-linejoin="round"/>`,
  },
  {
    id: "tryout",
    svg:
      sheet(16, 12, 50, 66) +
      `<rect x="25" y="23" width="18" height="10" rx="3" fill="{A}"/>` +
      `<g class="fine"><rect x="25" y="41" width="32" height="5" rx="2.5" fill="{OP}"/><rect x="25" y="51" width="26" height="5" rx="2.5" fill="{OP}"/><rect x="25" y="61" width="18" height="5" rx="2.5" fill="{OP}"/></g>` +
      `<rect x="63" y="40" width="10" height="7" rx="2" fill="{A}"/>` +
      `<circle cx="64" cy="70" r="18" fill="{AD}"/><circle cx="68" cy="66" r="18" fill="{A}"/><circle cx="68" cy="66" r="12" fill="{L}"/>` +
      `<path d="M68 66 V58 M68 66 L74 70" stroke="{OL}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`,
  },
  {
    id: "latsol",
    svg:
      sheet(16, 12, 50, 66) +
      `<rect x="24" y="21" width="12" height="12" rx="3" fill="{L}"/><rect x="24" y="37" width="12" height="12" rx="3" fill="{L}"/><rect x="24" y="53" width="12" height="12" rx="3" fill="{L}"/>` +
      `<g class="fine"><rect x="41" y="24.5" width="17" height="5" rx="2.5" fill="{OP}"/><rect x="41" y="40.5" width="17" height="5" rx="2.5" fill="{OP}"/><rect x="41" y="56.5" width="11" height="5" rx="2.5" fill="{OP}"/></g>` +
      `<path d="M26.5 27 L29.3 30 L33.5 24 M26.5 43 L29.3 46 L33.5 40" fill="none" stroke="{OL}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="63" y="30" width="14" height="38" rx="3" transform="translate(-3 3) rotate(40 70 60)" fill="{AD}"/>` +
      `<g transform="rotate(40 70 60)"><rect x="63" y="30" width="14" height="38" rx="3" fill="{A}"/><rect x="63" y="30" width="14" height="8" rx="3" fill="{AD}"/><path d="M63 68 L77 68 L70 82 Z" fill="{L}"/><path d="M67.3 76.6 L72.7 76.6 L70 82 Z" fill="{PD}"/></g>`,
  },
  {
    id: "rapor",
    svg:
      sheet(18, 12, 62, 68, 8) +
      `<g class="fine"><rect x="28" y="22" width="26" height="6" rx="3" fill="{OP}"/></g>` +
      `<rect x="30" y="52" width="11" height="18" rx="2.5" fill="{OP}"/><rect x="44" y="42" width="11" height="28" rx="2.5" fill="{OP}"/><rect x="58" y="31" width="11" height="39" rx="2.5" fill="{A}"/>` +
      `<rect x="26" y="70" width="46" height="4" rx="2" fill="{OP}"/>`,
  },
  {
    id: "lapor_masalah",
    svg:
      `<path transform="translate(-4 4)" d="${BUBBLE}" fill="{PD}"/><path d="${BUBBLE}" fill="{P}"/>` +
      `<circle cx="48" cy="38" r="17" fill="{A}"/><rect x="45" y="27" width="6" height="15" rx="3" fill="{OA}"/><circle cx="48" cy="48" r="3.5" fill="{OA}"/>`,
  },
  {
    id: "pdf",
    svg:
      `<path transform="translate(-4 4)" d="${DOC}" fill="{PD}"/><path d="${DOC}" fill="{P}"/>` +
      `<path d="M62 12 V26 A6 6 0 0 0 68 32 H82 Z" fill="{L}"/>` +
      `<g class="fine"><rect x="30" y="22" width="22" height="5" rx="2.5" fill="{OP}"/></g>` +
      `<rect x="10" y="48" width="58" height="24" rx="6" fill="{AD}"/><rect x="14" y="44" width="58" height="24" rx="6" fill="{A}"/>` +
      `<text x="43" y="62.5" text-anchor="middle" ${FONT} font-size="17" fill="{OA}">PDF</text>`,
  },
  {
    id: "promo",
    svg:
      `<g transform="translate(-8 12) rotate(-45 48 48)"><path d="${TAG}" fill="{PD}"/></g>` +
      `<g transform="translate(-4 8) rotate(-45 48 48)"><path d="${TAG}" fill="{P}"/><circle cx="30" cy="48" r="6.5" fill="{A}"/><circle cx="30" cy="48" r="2.8" fill="{L}"/></g>` +
      `<circle cx="44" cy="43" r="5" fill="{OP}"/><circle cx="59" cy="58" r="5" fill="{OP}"/>` +
      `<path d="M61 40 L42 61" stroke="{OP}" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    id: "kalender",
    svg:
      `<rect x="14" y="20" width="68" height="62" rx="9" fill="{PD}"/><rect x="18" y="16" width="68" height="62" rx="9" fill="{P}"/>` +
      `<path d="M27 16 H77 A9 9 0 0 1 86 25 V33 H18 V25 A9 9 0 0 1 27 16 Z" fill="{A}"/>` +
      `<rect x="32" y="9" width="7" height="15" rx="3.5" fill="{PD}"/><rect x="65" y="9" width="7" height="15" rx="3.5" fill="{PD}"/>` +
      [40, 52.5, 65]
        .flatMap((y) =>
          [29, 46.5, 64].map(
            (x) =>
              `<rect x="${x}" y="${y}" width="11" height="10" rx="2" fill="${x === 46.5 && y === 52.5 ? "{A}" : "{OP}"}"/>`,
          ),
        )
        .join(""),
  },
  {
    id: "live_class",
    svg:
      `<g transform="translate(-3 3)" fill="none" stroke="{PD}" stroke-width="8" stroke-linecap="round">${ARCS}</g>` +
      `<g fill="none" stroke="{P}" stroke-width="8" stroke-linecap="round">${ARCS}</g>` +
      `<circle cx="45" cy="51" r="11" fill="{AD}"/><circle cx="48" cy="48" r="11" fill="{A}"/>`,
  },
  {
    id: "grup",
    svg:
      `<g transform="translate(-3 3)" fill="{AD}">${PERSON_SIDE(27)}${PERSON_SIDE(69)}</g>` +
      `<g fill="{A}">${PERSON_SIDE(27)}${PERSON_SIDE(69)}</g>` +
      `<g transform="translate(-4 4)" fill="{PD}">${PERSON_FRONT}</g>` +
      `<g fill="{P}">${PERSON_FRONT}</g>`,
  },
  {
    id: "journey",
    svg:
      `<g class="fine"><path d="M20 80 C34 80 30 62 44 62 C54 62 56 71 62 70" fill="none" stroke="{AX}" stroke-width="5" stroke-linecap="round" stroke-dasharray="1 9"/></g>` +
      `<circle cx="20" cy="80" r="6" fill="{AX}"/>` +
      `<path transform="translate(-4 4)" d="${PIN}" fill="{PD}"/><path d="${PIN}" fill="{P}"/>` +
      `<circle cx="62" cy="32" r="8.5" fill="{OP}"/>`,
  },
  {
    id: "info",
    nama: "Info / Pengumuman",
    svg:
      `<path d="M32 60 L38 80 A4 4 0 0 0 42 83 H47 A3 3 0 0 0 50 79 L45 62 Z" fill="{PD}"/>` +
      `<path transform="translate(-4 4)" d="${CONE}" fill="{PD}"/><path d="${CONE}" fill="{P}"/>` +
      `<rect x="14" y="35" width="16" height="26" rx="6" fill="{A}"/>` +
      `<path d="M74 38 Q79 48 74 58" fill="none" stroke="{AX}" stroke-width="5" stroke-linecap="round"/>` +
      `<g class="fine"><path d="M81 31 Q88 48 81 65" fill="none" stroke="{AX}" stroke-width="5" stroke-linecap="round"/></g>`,
  },
  {
    id: "tips",
    nama: "Tips / Ide",
    svg:
      `<path transform="translate(-4 4)" d="${BULB}" fill="{AD}"/><path d="${BULB}" fill="{A}"/>` +
      `<rect x="35" y="67" width="26" height="6" rx="3" fill="{P}"/><rect x="37" y="75" width="22" height="6" rx="3" fill="{P}"/><rect x="42" y="83" width="12" height="4" rx="2" fill="{PD}"/>` +
      `<path d="M33 34 A15 15 0 0 1 44 21" fill="none" stroke="{OA}" stroke-width="5" stroke-linecap="round"/>` +
      `<g class="fine"><path d="M40 50 L44 44 L48 50 L52 44 L56 50" fill="none" stroke="{OA}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  },
  {
    id: "link",
    svg:
      `<g transform="translate(-3 3)" fill="none" stroke-width="9">${LINKS("{PD}", "{AD}")}</g>` +
      `<g fill="none" stroke-width="9">${LINKS("{P}", "{A}")}</g>`,
  },
  {
    id: "drilling_soal",
    svg:
      `<rect x="26" y="14" width="46" height="60" rx="6" fill="{AD}"/><rect x="30" y="10" width="46" height="60" rx="6" fill="{A}"/>` +
      sheet(18, 18, 48, 62, 6) +
      `<g class="fine"><rect x="26" y="28" width="28" height="5" rx="2.5" fill="{OP}"/><rect x="26" y="38" width="22" height="5" rx="2.5" fill="{OP}"/><rect x="26" y="48" width="26" height="5" rx="2.5" fill="{OP}"/></g>` +
      `<circle cx="63" cy="69" r="18" fill="{LD}"/><circle cx="67" cy="65" r="18" fill="{L}"/>` +
      `<g fill="none" stroke="{OL}" stroke-width="4" stroke-linecap="round"><path d="M58.5 61.9 A9 9 0 0 1 75.5 61.9"/><path d="M75.5 68.1 A9 9 0 0 1 58.5 68.1"/></g>` +
      `<path d="M76.5 64.7 L78.1 58.8 L71.5 61.2 Z M57.5 65.3 L62.5 68.8 L55.9 71.2 Z" fill="{OL}" stroke="{OL}" stroke-width="1.5" stroke-linejoin="round"/>`,
  },
  {
    id: "kertas_soal",
    nama: "Lembar Jawaban / Kertas Soal",
    svg:
      sheet(18, 12, 58, 68) +
      `<g class="fine"><rect x="26" y="20" width="26" height="6" rx="3" fill="{OP}"/>` +
      [37, 51, 65]
        .flatMap((y) =>
          [31, 42.5, 54, 65.5].map(
            (x) => `<circle cx="${x}" cy="${y}" r="4.3" fill="none" stroke="{OP}" stroke-width="2.4"/>`,
          ),
        )
        .join("") +
      `</g>` +
      `<circle cx="42.5" cy="37" r="5.4" fill="{A}"/><circle cx="65.5" cy="51" r="5.4" fill="{A}"/><circle cx="31" cy="65" r="5.4" fill="{A}"/>`,
  },
  { id: "numerik", svg: tileText("123") },
  { id: "soal_cerita", nama: "Verbal / Soal Cerita", svg: tileText("Aa", 32, 55) },
  { id: "kuantitatif", svg: tileText("x≥y", 25, 52) },
  {
    id: "figural_serial",
    svg: tile(
      `<circle cx="31" cy="44" r="7" fill="{OP}"/><path d="M50 36 L58.5 51 H41.5 Z" fill="{OP}" stroke="{OP}" stroke-width="1.5" stroke-linejoin="round"/><rect x="62" y="37.5" width="13" height="13" rx="2" fill="{OP}"/>`,
    ),
  },
  {
    id: "figural_ketidaksamaan",
    svg: tile(
      `<circle cx="32" cy="44" r="7" fill="{OP}"/><circle cx="50" cy="44" r="7" fill="{OP}"/><path d="M68 36 L76.5 51 H59.5 Z" fill="{A}" stroke="{A}" stroke-width="1.5" stroke-linejoin="round"/>`,
    ),
  },
  {
    id: "figural_analogi",
    svg: tile(
      `<rect x="25" y="37" width="14" height="14" rx="2" fill="{OP}"/><circle cx="50" cy="39.5" r="2.6" fill="{OP}"/><circle cx="50" cy="48.5" r="2.6" fill="{OP}"/><circle cx="67" cy="44" r="7.5" fill="{OP}"/>`,
    ),
  },
  {
    id: "kalkulator",
    svg:
      `<rect x="18" y="14" width="56" height="70" rx="9" fill="{PD}"/><rect x="22" y="10" width="56" height="70" rx="9" fill="{P}"/>` +
      `<rect x="30" y="18" width="40" height="16" rx="4" fill="{L}"/>` +
      `<g class="fine"><rect x="48" y="23" width="16" height="6" rx="3" fill="{OL}"/></g>` +
      [42, 54, 66]
        .flatMap((y) =>
          [31, 45, 59].map(
            (x) =>
              `<rect x="${x}" y="${y}" width="10" height="8" rx="2.5" fill="${x === 59 && y === 66 ? "{A}" : "{OP}"}"/>`,
          ),
        )
        .join(""),
  },
  {
    id: "tengkorak_lup",
    nama: "Psikologi / Kepribadian",
    svg:
      `<path transform="translate(-4 4)" d="${HEAD}" fill="{PD}"/><path d="${HEAD}" fill="{P}"/>` +
      `<circle cx="50" cy="40" r="15" fill="{L}"/>` +
      `<path d="M42 32 V37 C42 43 45.5 46 50 46 C54.5 46 58 43 58 37 V32 M50 29 V53 M45.5 53 H54.5" fill="none" stroke="{OL}" stroke-width="3.4" stroke-linecap="round"/>`,
  },
];

export const V2_BY_ID = new Map(V2_GLYPHS.map((g) => [g.id, g]));
