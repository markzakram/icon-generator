/**
 * Geometry of the product box mark: an isometric box whose top and left faces are solid (dark) and whose
 * right face is an outlined panel (bright) that carries the app's pictogram. Everything is computed, so
 * every app gets exactly the same box; only colors and the pictogram change.
 */

export type P = [number, number];

export interface BoxParams {
  /** Horizontal extent of the left face. */
  a: number;
  /** Horizontal extent of the right face (the panel). */
  b: number;
  /** Height of the side faces. */
  h: number;
  /** Slope of the receding edges (tan of their angle, about 28 degrees). */
  k: number;
  /** Gap between faces. */
  gutter: number;
  /** Corner radius of every face. */
  radius: number;
  /** Thickness of the panel outline. */
  panelStroke: number;
  /**
   * The panel is the right face enlarged from its top-left corner (along the face and downward),
   * as in the original logos where it stands out from the box.
   */
  panelScale: { u: number; v: number };
  /** Handle slot cut into the left face (fractions of the face), or none for small sizes. */
  handle: { from: number; to: number; y: number; width: number } | null;
  /** Pictogram inset inside the panel, as a fraction of the square it sits in. */
  pictoMargin: number;
  /** Multiplier for pictogram stroke widths (thicker in the small version). */
  pictoWeight: number;
}

/** Master proportions, measured from the four existing logos and made consistent. */
export const BOX: BoxParams = {
  a: 300,
  b: 326,
  h: 440,
  k: 0.54,
  gutter: 24,
  radius: 26,
  panelStroke: 44,
  panelScale: { u: 1.18, v: 1.09 },
  handle: { from: 0.26, to: 0.64, y: 0.25, width: 40 },
  pictoMargin: 0.025,
  pictoWeight: 1,
};

/** Small version (favicons, 32 px and below): no handle, heavier panel and pictogram. */
export const BOX_SMALL: BoxParams = {
  ...BOX,
  gutter: 34,
  radius: 34,
  panelStroke: 58,
  handle: null,
  pictoMargin: 0.02,
  pictoWeight: 1.45,
};

export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface MarkGeometry {
  /** Path data of the top face. */
  top: string;
  /** Left face with the handle cut out (fill-rule evenodd). */
  left: string;
  /** Panel outline ring (fill-rule evenodd). */
  panel: string;
  /** Maps a 24-unit pictogram onto the panel. */
  picto: Matrix;
  bbox: { x: number; y: number; w: number; h: number };
  /** Farthest silhouette corner from the center: sizes the mark inside round icon masks. */
  reach: number;
  /** Points to hang labels on (Panduan logo). */
  anchors: { top: P; left: P; handle: P | null; panel: P; picto: P };
}

const add = (p: P, q: P): P => [p[0] + q[0], p[1] + q[1]];
const sub = (p: P, q: P): P => [p[0] - q[0], p[1] - q[1]];
const mul = (p: P, s: number): P => [p[0] * s, p[1] * s];
const len = (p: P) => Math.hypot(p[0], p[1]);
const unit = (p: P): P => mul(p, 1 / len(p));
const cross = (p: P, q: P) => p[0] * q[1] - p[1] * q[0];
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();
const pt = (p: P) => `${n2(p[0])} ${n2(p[1])}`;

function intersect(p: P, r: P, q: P, s: P): P {
  const t = cross(sub(q, p), s) / cross(r, s);
  return add(p, mul(r, t));
}

/**
 * Moves each edge of a convex, clockwise (screen coordinates) polygon inward by its own distance.
 * Vertex i is where edges i-1 and i meet.
 */
export function inset(poly: P[], d: number[]): P[] {
  const n = poly.length;
  const lines = poly.map((p, i) => {
    const e = unit(sub(poly[(i + 1) % n], p));
    return { p: add(p, mul([-e[1], e[0]], d[i])), e };
  });
  return poly.map((_, i) => {
    const l1 = lines[(i - 1 + n) % n];
    const l2 = lines[i];
    return intersect(l1.p, l1.e, l2.p, l2.e);
  });
}

/** Path of a polygon with every corner rounded to radius r (smaller where an edge is too short). */
export function rounded(poly: P[], r: number): string {
  const n = poly.length;
  let d = "";
  poly.forEach((p1, i) => {
    const p0 = poly[(i - 1 + n) % n];
    const p2 = poly[(i + 1) % n];
    const v1 = unit(sub(p0, p1));
    const v2 = unit(sub(p2, p1));
    const ang = Math.acos(Math.max(-1, Math.min(1, v1[0] * v2[0] + v1[1] * v2[1])));
    const lim = Math.min(len(sub(p0, p1)), len(sub(p2, p1))) / 2;
    let t = r / Math.tan(ang / 2);
    let rr = r;
    if (t > lim) {
      t = lim;
      rr = t * Math.tan(ang / 2);
    }
    const s = add(p1, mul(v1, t));
    const e = add(p1, mul(v2, t));
    const sweep = cross(sub(p1, p0), sub(p2, p1)) > 0 ? 1 : 0;
    d += `${i === 0 ? "M" : "L"}${pt(s)}A${n2(rr)} ${n2(rr)} 0 0 ${sweep} ${pt(e)}`;
  });
  return `${d}Z`;
}

/** Stadium shape between two centers (used as a hole, so it winds the other way). */
function capsule(c1: P, c2: P, r: number): string {
  const e = unit(sub(c2, c1));
  const nrm: P = [-e[1], e[0]];
  const p1 = add(c1, mul(nrm, r));
  const p2 = add(c2, mul(nrm, r));
  const p3 = add(c2, mul(nrm, -r));
  const p4 = add(c1, mul(nrm, -r));
  return `M${pt(p1)}L${pt(p2)}A${n2(r)} ${n2(r)} 0 0 0 ${pt(p3)}L${pt(p4)}A${n2(r)} ${n2(r)} 0 0 0 ${pt(p1)}Z`;
}

/** The box mark with its silhouette centered on (cx, cy). */
export function markGeometry(p: BoxParams = BOX, cx = 512, cy = 512): MarkGeometry {
  const { a, b, h, k } = p;
  // built around the front-top corner B = (0, 0), then moved so the whole silhouette is centered
  const B: P = [0, 0];
  const L: P = [-a, -k * a];
  const R: P = [b, -k * b];
  const T = add(L, [b, -k * b]);
  const F: P = [0, h];
  const Lb = add(L, [0, h]);
  const Rb = add(R, [0, h]);
  const g = p.gutter / 2;

  const top = inset([L, T, R, B], [0, 0, g, g]);
  const left = inset([L, B, F, Lb], [g, g, 0, 0]);
  const face = inset([B, R, Rb, F], [g, 0, 0, g]);
  const o = face[0];
  const u = mul(sub(face[1], o), p.panelScale.u);
  const v = mul(sub(face[3], o), p.panelScale.v);
  const panel: P[] = [o, add(o, u), add(add(o, u), v), add(o, v)];

  const all = [...top, ...left, ...panel];
  const xs = all.map((q) => q[0]);
  const ys = all.map((q) => q[1]);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  const d: P = [cx - (box.x + box.w / 2), cy - (box.y + box.h / 2)];
  const mv = (q: P): P => add(q, d);
  const [topM, leftM, panelM] = [top, left, panel].map((poly) => poly.map(mv));
  const s = p.panelStroke;
  const inner = inset(panelM, [s, s, s, s]);

  let leftPath = rounded(leftM, p.radius);
  let handleAt: P | null = null;
  if (p.handle) {
    const hd = p.handle;
    const c1 = mv(add(L, [hd.from * a, k * hd.from * a + hd.y * h]));
    const c2 = mv(add(L, [hd.to * a, k * hd.to * a + hd.y * h]));
    leftPath += capsule(c1, c2, hd.width / 2);
    handleAt = mul(add(c1, c2), 0.5);
  }

  // pictogram: a square in the panel's own plane, centered in the inner area
  const Wi = inner[1][0] - inner[0][0];
  const Hi = inner[3][1] - inner[0][1];
  const sq = Math.hypot(1, k);
  const faceW = Wi * sq;
  const side = Math.min(faceW, Hi) * (1 - 2 * p.pictoMargin);
  const du = (faceW - side) / 2 / sq;
  const dv = (Hi - side) / 2;
  const origin = add(inner[0], [du, -k * du + dv]);
  const sc = side / 24;

  return {
    top: rounded(topM, p.radius),
    left: leftPath,
    panel: rounded(panelM, p.radius) + rounded(inner, Math.max(p.radius * 0.45, p.radius - s * 0.6)),
    picto: { a: sc / sq, b: (-k * sc) / sq, c: 0, d: sc, e: origin[0], f: origin[1] },
    bbox: { x: box.x + d[0], y: box.y + d[1], w: box.w, h: box.h },
    reach: Math.max(...[...topM, ...leftM, ...panelM].map((q) => Math.hypot(q[0] - cx, q[1] - cy))),
    anchors: {
      top: centroid(topM),
      left: centroid(leftM),
      handle: handleAt,
      panel: mul(add(panelM[1], panelM[2]), 0.5),
      picto: add(origin, [(12 * sc) / sq, (-k * 12 * sc) / sq + 12 * sc]),
    },
  };
}

function centroid(poly: P[]): P {
  return mul(poly.reduce((acc, q) => add(acc, q), [0, 0] as P), 1 / poly.length);
}

export function matrixAttr(m: Matrix): string {
  return `matrix(${[m.a, m.b, m.c, m.d, m.e, m.f].map((v) => Math.round(v * 10000) / 10000).join(" ")})`;
}
