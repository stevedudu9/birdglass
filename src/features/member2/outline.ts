import type { PointMm, ShapeEntry, Unit } from './types';

// Same micrometre rounding as readDimensions, kept local to avoid a circular import.
const toMm = (value: number, factor: number) => Math.round(value * factor * 1e6) / 1e6;

/** Physical glass outlines for non-rectangular panes, in millimetres inside the measured
 * width × height bounding box (origin at the top-left, y downward). Rectangles have no outline. */
export const SHAPE_KINDS = ['rectangle', 'arch', 'raked', 'custom'] as const;
export const MAX_OUTLINE_VERTICES = 1000;
const ARC_SEGMENT_MM = 5;
const EDGE_TOLERANCE_MM = 1e-6;

const UNIT_FACTOR: Record<Unit, number> = { mm: 1, cm: 10, m: 1000 };

function readLength(text: string | undefined, unit: Unit, label: string): number {
  if (!text?.trim()) throw new Error(`Enter the ${label}.`);
  const value = toMm(Number(text), UNIT_FACTOR[unit]);
  if (!Number.isFinite(value) || value < 0) throw new Error(`The ${label} must be a finite number of zero or more.`);
  return value;
}

export function polygonArea(points: PointMm[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    sum += a.xMm * b.yMm - b.xMm * a.yMm;
  }
  return sum / 2;
}

function segmentsCross(a: PointMm, b: PointMm, c: PointMm, d: PointMm): boolean {
  const orient = (p: PointMm, q: PointMm, r: PointMm) => (q.xMm - p.xMm) * (r.yMm - p.yMm) - (q.yMm - p.yMm) * (r.xMm - p.xMm);
  const d1 = orient(c, d, a), d2 = orient(c, d, b), d3 = orient(a, b, c), d4 = orient(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Rejects self-crossing, degenerate or out-of-box outlines and returns a clockwise copy (y downward). */
export function normalizeOutline(points: PointMm[], widthMm: number, heightMm: number): PointMm[] {
  if (points.length < 3) throw new Error('A glass outline needs at least three corner points.');
  if (points.length > MAX_OUTLINE_VERTICES) throw new Error(`A glass outline supports up to ${MAX_OUTLINE_VERTICES} points.`);
  if (points.some(p => !Number.isFinite(p.xMm) || !Number.isFinite(p.yMm))) throw new Error('Every outline point needs finite x and y values.');
  const outside = points.some(p => p.xMm < -EDGE_TOLERANCE_MM || p.yMm < -EDGE_TOLERANCE_MM || p.xMm > widthMm + EDGE_TOLERANCE_MM || p.yMm > heightMm + EDGE_TOLERANCE_MM);
  if (outside) throw new Error('Every outline point must lie within the measured width and height.');
  const xs = points.map(p => p.xMm), ys = points.map(p => p.yMm);
  // The photo corners mark the bounding rectangle, so the outline must touch all four sides.
  if (Math.min(...xs) > 0.5 || Math.max(...xs) < widthMm - 0.5 || Math.min(...ys) > 0.5 || Math.max(...ys) < heightMm - 0.5)
    throw new Error('The outline must touch the left, right, top and bottom of the measured width and height.');
  const clean = points.filter((p, i) => { const q = points[(i + 1) % points.length]; return Math.hypot(p.xMm - q.xMm, p.yMm - q.yMm) > EDGE_TOLERANCE_MM; });
  if (clean.length < 3) throw new Error('A glass outline needs at least three distinct corner points.');
  for (let i = 0; i < clean.length; i++) for (let j = i + 2; j < clean.length; j++) {
    if (i === 0 && j === clean.length - 1) continue;
    if (segmentsCross(clean[i], clean[(i + 1) % clean.length], clean[j], clean[(j + 1) % clean.length]))
      throw new Error('The glass outline crosses itself. List its corners in order around the edge.');
  }
  const area = polygonArea(clean);
  if (Math.abs(area) < 1) throw new Error('The glass outline has no usable area.');
  // With y downward, a positive shoelace area is clockwise on screen.
  return area > 0 ? clean : [...clean].reverse();
}

function archOutline(widthMm: number, heightMm: number, riseMm: number): PointMm[] {
  if (riseMm <= 0) throw new Error('The arch rise must be greater than zero.');
  if (riseMm > widthMm / 2 + EDGE_TOLERANCE_MM) throw new Error('The arch rise cannot exceed half the glass width (a semicircle).');
  if (riseMm > heightMm + EDGE_TOLERANCE_MM) throw new Error('The arch rise cannot exceed the glass height.');
  // Segmental arch: chord = width, sagitta = rise; the apex is the top-centre of the bounding box.
  const radius = (widthMm * widthMm / 4 + riseMm * riseMm) / (2 * riseMm);
  const centre = { xMm: widthMm / 2, yMm: radius };
  const halfAngle = Math.asin(Math.min(1, widthMm / 2 / radius));
  // An even count puts a vertex exactly on the apex, so the outline touches the top of the box.
  const steps = 2 * Math.min((MAX_OUTLINE_VERTICES - 4) / 2, Math.max(4, Math.ceil(halfAngle * radius / ARC_SEGMENT_MM)));
  const arc: PointMm[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = -halfAngle + 2 * halfAngle * i / steps;
    arc.push({ xMm: centre.xMm + radius * Math.sin(angle), yMm: centre.yMm - radius * Math.cos(angle) });
  }
  arc[0] = { xMm: 0, yMm: riseMm }; arc[steps] = { xMm: widthMm, yMm: riseMm };
  const sides = heightMm - riseMm > EDGE_TOLERANCE_MM ? [{ xMm: widthMm, yMm: heightMm }, { xMm: 0, yMm: heightMm }] : [];
  return [...arc, ...sides];
}

function rakedOutline(widthMm: number, heightMm: number, shortSide: 'left' | 'right', shortHeightMm: number): PointMm[] {
  if (shortHeightMm >= heightMm) throw new Error('The shorter side must be lower than the measured glass height.');
  const drop = heightMm - shortHeightMm;
  const points = shortSide === 'left'
    ? [{ xMm: 0, yMm: drop }, { xMm: widthMm, yMm: 0 }, { xMm: widthMm, yMm: heightMm }, { xMm: 0, yMm: heightMm }]
    : [{ xMm: 0, yMm: 0 }, { xMm: widthMm, yMm: drop }, { xMm: widthMm, yMm: heightMm }, { xMm: 0, yMm: heightMm }];
  return points;
}

export function parseCustomPoints(text: string | undefined, unit: Unit): PointMm[] {
  if (!text?.trim()) throw new Error('Enter the outline corners as x, y pairs.');
  const pairs = text.trim().split(/[;\n]+/).map(item => item.trim()).filter(Boolean);
  return pairs.map(pair => {
    const parts = pair.split(/[,\s]+/).filter(Boolean);
    if (parts.length !== 2) throw new Error(`"${pair.slice(0, 30)}" is not an x, y pair.`);
    const [x, y] = parts.map(part => toMm(Number(part), UNIT_FACTOR[unit]));
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`"${pair.slice(0, 30)}" is not an x, y pair.`);
    return { xMm: x, yMm: y };
  });
}

/** Null means an ordinary rectangle, which keeps the original rectangular rules unchanged. */
export function readOutline(shape: ShapeEntry | undefined, unit: Unit, widthMm: number, heightMm: number): PointMm[] | null {
  if (!shape || shape.kind === 'rectangle') return null;
  if (!SHAPE_KINDS.includes(shape.kind)) throw new Error('Choose a supported glass shape.');
  const raw = shape.kind === 'arch' ? archOutline(widthMm, heightMm, readLength(shape.rise, unit, 'arch rise'))
    : shape.kind === 'raked' ? rakedOutline(widthMm, heightMm, shape.shortSide === 'right' ? 'right' : 'left', readLength(shape.shortHeight, unit, 'shorter side height'))
    : parseCustomPoints(shape.points, unit);
  return normalizeOutline(raw, widthMm, heightMm);
}

export function sameOutline(a: PointMm[] | null | undefined, b: PointMm[] | null | undefined, tolerance = 1e-6): boolean {
  if (!a?.length || !b?.length) return !a?.length && !b?.length;
  return a.length === b.length && a.every((p, i) => Math.abs(p.xMm - b[i].xMm) <= tolerance && Math.abs(p.yMm - b[i].yMm) <= tolerance);
}

/** Fast point/edge queries for a fixed outline. Edges are bucketed by y so ray casting stays local. */
export class OutlineIndex {
  readonly points: PointMm[];
  private readonly bucketMm = 25;
  private readonly rows = new Map<number, number[]>();
  private readonly cells = new Map<string, number[]>();
  constructor(points: PointMm[]) {
    this.points = points;
    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length];
      const y0 = Math.floor(Math.min(a.yMm, b.yMm) / this.bucketMm), y1 = Math.floor(Math.max(a.yMm, b.yMm) / this.bucketMm);
      const x0 = Math.floor(Math.min(a.xMm, b.xMm) / this.bucketMm), x1 = Math.floor(Math.max(a.xMm, b.xMm) / this.bucketMm);
      for (let y = y0; y <= y1; y++) {
        const row = this.rows.get(y) ?? []; row.push(i); this.rows.set(y, row);
        for (let x = x0; x <= x1; x++) { const key = `${x}:${y}`; const cell = this.cells.get(key) ?? []; cell.push(i); this.cells.set(key, cell); }
      }
    });
  }
  contains(p: PointMm): boolean {
    let inside = false;
    for (const i of this.rows.get(Math.floor(p.yMm / this.bucketMm)) ?? []) {
      const a = this.points[i], b = this.points[(i + 1) % this.points.length];
      if ((a.yMm > p.yMm) !== (b.yMm > p.yMm) && p.xMm < (b.xMm - a.xMm) * (p.yMm - a.yMm) / (b.yMm - a.yMm) + a.xMm) inside = !inside;
    }
    return inside;
  }
  /** Distance to the nearest edge, searched out to `limit`; returns Infinity beyond it. */
  distanceToEdge(p: PointMm, limit: number): number {
    const reach = Math.ceil(limit / this.bucketMm);
    const cx = Math.floor(p.xMm / this.bucketMm), cy = Math.floor(p.yMm / this.bucketMm);
    let best = Infinity; const seen = new Set<number>();
    for (let y = cy - reach; y <= cy + reach; y++) for (let x = cx - reach; x <= cx + reach; x++) {
      for (const i of this.cells.get(`${x}:${y}`) ?? []) {
        if (seen.has(i)) continue; seen.add(i);
        best = Math.min(best, segmentDistance(p, this.points[i], this.points[(i + 1) % this.points.length]));
      }
    }
    return best <= limit ? best : Infinity;
  }
  /** A complete circle of `radius` lies on the glass. */
  fits(p: PointMm, radius: number, tolerance = 1e-7): boolean {
    return this.contains(p) && this.distanceToEdge(p, radius) >= radius - tolerance;
  }
}

export function segmentDistance(p: PointMm, a: PointMm, b: PointMm): number {
  const dx = b.xMm - a.xMm, dy = b.yMm - a.yMm, length2 = dx * dx + dy * dy;
  const t = length2 ? Math.max(0, Math.min(1, ((p.xMm - a.xMm) * dx + (p.yMm - a.yMm) * dy) / length2)) : 0;
  return Math.hypot(p.xMm - (a.xMm + t * dx), p.yMm - (a.yMm + t * dy));
}
