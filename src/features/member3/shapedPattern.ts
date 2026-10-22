import { LIMITS } from '../member2/model';
import { OutlineIndex, polygonArea, sameOutline } from '../member2/outline';
import type { DotMm, GuidelineProfile, LayoutRequest, LayoutResult, PointMm } from '../member2/types';
import { gridMetrics, paneLimitMessage } from './grid';

// Shaped panes (arches, sloped tops, triangles, custom outlines).
// We lay the normal centred 50 mm grid over the bounding box and keep only dots that fit fully
// on the glass, then add extra dots where curved or sloping edges are left uncovered.
// BG-EDGE-002 is our own rule: shaped panes get the same worst-case gaps as a rectangle that
// just passes BG-EDGE-001, i.e. hypot(25, 30) - 5 = 34.05 mm on edges, hypot(30, 30) - 5 = 37.43 mm at corners.
export const SHAPED_MIN_EDGE_DOT_CLEAR_GAP_MM = 5;
const SAMPLE_STEP_MM = 3;
const BAND_DEPTH_MM = 45;
const SHARP_VERTEX_DEG = 150;
const TOLERANCE = 1e-6;

export function coverageLimits(guideline: GuidelineProfile) {
  const radius = guideline.dotDiameterMm / 2, boundary = guideline.maxBoundaryClearGapMm ?? 25;
  return {
    edgeLimitMm: Math.hypot(guideline.targetCenterPitchXmm / 2, boundary + radius) - radius,
    cornerLimitMm: Math.hypot(boundary + radius, boundary + radius) - radius,
    cornerReachMm: Math.SQRT2 * (boundary + radius),
  };
}

type Sample = { point: PointMm; normal: PointMm; limit: number };

/** Glass points along the edge and in a band just inside it, each with its permitted gap. */
function coverageSamples(outline: OutlineIndex, guideline: GuidelineProfile): Sample[] {
  const { edgeLimitMm, cornerLimitMm, cornerReachMm } = coverageLimits(guideline);
  const pts = outline.points, n = pts.length;
  const sharp = pts.filter((v, i) => {
    const prev = pts[(i - 1 + n) % n], next = pts[(i + 1) % n];
    const a = { x: prev.xMm - v.xMm, y: prev.yMm - v.yMm }, b = { x: next.xMm - v.xMm, y: next.yMm - v.yMm };
    const convex = (v.xMm - prev.xMm) * (next.yMm - v.yMm) - (v.yMm - prev.yMm) * (next.xMm - v.xMm) > 0;
    const angle = Math.acos(Math.max(-1, Math.min(1, (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y))))) * 180 / Math.PI;
    return convex && angle < SHARP_VERTEX_DEG;
  });
  const limitAt = (p: PointMm) => sharp.some(v => Math.hypot(p.xMm - v.xMm, p.yMm - v.yMm) <= cornerReachMm) ? cornerLimitMm : edgeLimitMm;
  const samples: Sample[] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % n], length = Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm);
    if (length < TOLERANCE) return;
    // Clockwise outline with y downward: the inward normal is (-dy, dx).
    const normal = { xMm: -(b.yMm - a.yMm) / length, yMm: (b.xMm - a.xMm) / length };
    const steps = Math.max(1, Math.ceil(length / SAMPLE_STEP_MM));
    for (let s = 0; s < steps; s++) {
      const t = s / steps, base = { xMm: a.xMm + (b.xMm - a.xMm) * t, yMm: a.yMm + (b.yMm - a.yMm) * t };
      for (let depth = 0; depth <= BAND_DEPTH_MM; depth += SAMPLE_STEP_MM) {
        const point = { xMm: base.xMm + normal.xMm * depth, yMm: base.yMm + normal.yMm * depth };
        if (depth === 0 || outline.contains(point)) samples.push({ point, normal, limit: limitAt(point) });
      }
    }
  });
  return samples;
}

class DotHash {
  private readonly cells = new Map<string, PointMm[]>();
  constructor(private readonly size: number) {}
  private key(x: number, y: number) { return `${Math.floor(x / this.size)}:${Math.floor(y / this.size)}`; }
  add(p: PointMm) { const k = this.key(p.xMm, p.yMm); const cell = this.cells.get(k) ?? []; cell.push(p); this.cells.set(k, cell); }
  /** Nearest centre distance, exact when it is within one cell size; otherwise Infinity. */
  nearest(p: PointMm): number {
    const cx = Math.floor(p.xMm / this.size), cy = Math.floor(p.yMm / this.size);
    let best = Infinity;
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++)
      for (const q of this.cells.get(`${x}:${y}`) ?? []) best = Math.min(best, Math.hypot(p.xMm - q.xMm, p.yMm - q.yMm));
    return best <= this.size ? best : Infinity;
  }
}

function latticePositions(widthMm: number, heightMm: number) {
  const grid = gridMetrics(widthMm, heightMm);
  if (grid.dotCount > LIMITS.dots * 4) throw new Error(paneLimitMessage(grid.dotCount));
  return grid;
}

export function generateShapedDots(request: LayoutRequest, guideline: GuidelineProfile) {
  const outline = new OutlineIndex(request.outlineMm!);
  const radius = guideline.dotDiameterMm / 2, pitch = guideline.targetCenterPitchXmm;
  const grid = latticePositions(request.widthMm, request.heightMm);
  const dots: DotMm[] = [], hash = new DotHash(pitch);
  for (let row = 0; row < grid.rows; row++) for (let column = 0; column < grid.columns; column++) {
    const p = { xMm: grid.startXmm + column * pitch, yMm: grid.startYmm + row * pitch };
    if (outline.fits(p, radius)) { dots.push({ id: `r${row + 1}c${column + 1}`, ...p }); hash.add(p); }
  }
  if (dots.length > LIMITS.dots) throw new Error(paneLimitMessage(dots.length));
  const minCentre = guideline.dotDiameterMm + SHAPED_MIN_EDGE_DOT_CLEAR_GAP_MM;
  const samples = coverageSamples(outline, guideline);
  // Prefer a dot whose edge sits about 10 mm in from the glass, then nearer or deeper positions.
  const depths = [15, 12, 10, 8, 6.5, 5.2, 18, 21, 24, 27, 30];
  const usable = (c: PointMm, p: PointMm, limit: number) => outline.fits(c, radius) && hash.nearest(c) >= minCentre
    && Math.hypot(c.xMm - p.xMm, c.yMm - p.yMm) - radius <= limit;
  let edgeDots = 0;
  for (let pass = 0; pass < 3; pass++) {
    let added = 0;
    for (const { point, normal, limit } of samples) {
      if (hash.nearest(point) - radius <= limit + TOLERANCE) continue;
      let chosen: PointMm | null = null;
      for (const t of depths) {
        const c = { xMm: point.xMm + normal.xMm * t, yMm: point.yMm + normal.yMm * t };
        if (usable(c, point, limit)) { chosen = c; break; }
      }
      // Near sharp or narrow corners the normal can leave the glass: search nearby instead.
      for (let ring = 2; !chosen && ring <= limit + radius; ring += 2) {
        for (let k = 0; k < 24 && !chosen; k++) {
          const angle = k * Math.PI / 12, c = { xMm: point.xMm + ring * Math.cos(angle), yMm: point.yMm + ring * Math.sin(angle) };
          if (usable(c, point, limit)) chosen = c;
        }
      }
      if (!chosen) continue; // Too narrow to cover; the validator reports it.
      if (dots.length >= LIMITS.dots) throw new Error(paneLimitMessage(dots.length + 1));
      dots.push({ id: `e${++edgeDots}`, ...chosen }); hash.add(chosen); added++;
    }
    if (!added) break;
  }
  return { dots, grid, edgeDotCount: edgeDots };
}

export type ShapedMeasurements = {
  maxGapMm: number; edgeLimitMm: number; cornerLimitMm: number; worstPointMm: PointMm | null;
  latticeDots: number; edgeDots: number; glassAreaMm2: number;
};

// Checks a shaped layout from its coordinates only (ids, counts and labels are ignored).
export function checkShapedLayout(layout: LayoutResult, request: LayoutRequest, guideline: GuidelineProfile, tolerance: number) {
  const issues: string[] = [];
  const outlineMm = request.outlineMm!;
  if (!layout.shape || layout.shape.kind !== request.shapeKind || !sameOutline(layout.shape.outlineMm, outlineMm))
    issues.push('The layout was generated for a different glass outline.');
  const outline = new OutlineIndex(outlineMm), radius = guideline.dotDiameterMm / 2, pitch = guideline.targetCenterPitchXmm;
  if (layout.dotsMm.some(dot => !outline.fits({ xMm: dot.xMm, yMm: dot.yMm }, radius, tolerance)))
    issues.push('A complete dot extends outside the glass outline.');
  const hash = new DotHash(pitch);
  let overlap = false;
  for (const dot of layout.dotsMm) {
    if (hash.nearest(dot) < guideline.dotDiameterMm - tolerance) overlap = true;
    hash.add(dot);
  }
  if (overlap) issues.push('Dots overlap or share a position.');
  const grid = gridMetrics(request.widthMm, request.heightMm);
  const onLattice = (dot: PointMm) => {
    const c = (dot.xMm - grid.startXmm) / pitch, r = (dot.yMm - grid.startYmm) / pitch;
    return Math.abs(c - Math.round(c)) * pitch <= tolerance && Math.abs(r - Math.round(r)) * pitch <= tolerance
      && Math.round(c) >= 0 && Math.round(c) < grid.columns && Math.round(r) >= 0 && Math.round(r) < grid.rows
      ? `${Math.round(c)}:${Math.round(r)}` : null;
  };
  const present = new Set(layout.dotsMm.map(onLattice).filter((key): key is string => key !== null));
  let omitted = false;
  for (let row = 0; row < grid.rows && !omitted; row++) for (let column = 0; column < grid.columns; column++) {
    const p = { xMm: grid.startXmm + column * pitch, yMm: grid.startYmm + row * pitch };
    if (!present.has(`${column}:${row}`) && outline.fits(p, radius)) { omitted = true; break; }
  }
  if (omitted) issues.push('The clipped grid omits a 50 mm grid position where a complete dot fits.');
  const columns = new Set([...present].map(key => key.split(':')[0])).size;
  const rows = new Set([...present].map(key => key.split(':')[1])).size;
  if (layout.actualCenterPitchXmm !== (columns > 1 ? pitch : null) || layout.actualCenterPitchYmm !== (rows > 1 ? pitch : null))
    issues.push('Reported grid pitch does not match the clipped grid coordinates.');
  const limits = coverageLimits(guideline);
  let maxGap = 0, worst: PointMm | null = null, exceeded: { point: PointMm; gap: number; limit: number } | null = null;
  for (const { point, limit } of coverageSamples(outline, guideline)) {
    const gap = hash.nearest(point) - radius;
    if (gap > maxGap) { maxGap = gap; worst = point; }
    if (gap > limit + tolerance && (!exceeded || gap - limit > exceeded.gap - exceeded.limit)) exceeded = { point, gap, limit };
  }
  if (exceeded) {
    const where = `${exceeded.point.xMm.toFixed(0)}, ${exceeded.point.yMm.toFixed(0)}`;
    issues.push(Number.isFinite(exceeded.gap)
      ? `Edge coverage gap of ${exceeded.gap.toFixed(1)} mm near (${where}) mm exceeds the ${exceeded.limit.toFixed(1)} mm BG-EDGE-002 limit. The glass may be too narrow there for a complete 10 mm dot.`
      : `No dot lies within ${pitch} mm of the glass near (${where}) mm. The glass may be too narrow there for a complete 10 mm dot.`);
  }
  const measurements: ShapedMeasurements = {
    maxGapMm: maxGap, edgeLimitMm: limits.edgeLimitMm, cornerLimitMm: limits.cornerLimitMm, worstPointMm: worst,
    latticeDots: layout.dotsMm.filter(dot => onLattice(dot) !== null).length,
    edgeDots: layout.dotsMm.filter(dot => onLattice(dot) === null).length,
    glassAreaMm2: Math.abs(polygonArea(outlineMm)),
  };
  return { issues, measurements };
}
