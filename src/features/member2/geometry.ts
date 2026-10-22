import { CORNER_KEYS } from './types';
import type { CornersNorm, PointNorm, ProjectedDot, DotMm, PointMm } from './types';

const EPS = 1e-10;
export type Homography = readonly number[];

export function validateCorners(corners: Partial<CornersNorm>): string[] {
  const p = CORNER_KEYS.map(key => corners[key]);
  if (p.some(v => !v)) return ['Select all four corners: TL, TR, BR, then BL.'];
  const points = p as PointNorm[];
  if (points.some(v => !Number.isFinite(v.u) || !Number.isFinite(v.v) || v.u < 0 || v.u > 1 || v.v < 0 || v.v > 1))
    return ['Every corner must be within the image.'];
  const cross = points.map((a, i) => {
    const b = points[(i + 1) % 4], c = points[(i + 2) % 4];
    return (b.u - a.u) * (c.v - b.v) - (b.v - a.v) * (c.u - b.u);
  });
  // In image coordinates, TL → TR → BR → BL has positive winding.
  if (cross.some(v => v <= 0.00001)) return ['Corners must form a convex glass area in TL → TR → BR → BL order. Avoid crossing or nearly straight edges.'];
  const area = points.reduce((sum, a, i) => {
    const b = points[(i + 1) % 4];
    return sum + a.u * b.v - b.u * a.v;
  }, 0) / 2;
  if (area < 0.001) return ['The selected glass area is too small. Use a closer photo.'];
  if (points.some((a, i) => Math.hypot(a.u - points[(i + 1) % 4].u, a.v - points[(i + 1) % 4].v) < 0.005))
    return ['Two corners are too close. Use a clearer photo.'];
  return [];
}

/** Solves in unit-square space, avoiding ill-conditioning from millimetre magnitudes. */
export function makeHomography(corners: CornersNorm): Homography {
  const issues = validateCorners(corners);
  if (issues.length) throw new Error(issues[0]);
  const source = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const rows: number[][] = [];
  CORNER_KEYS.forEach((key, i) => {
    const [x, y] = source[i], { u, v } = corners[key];
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let row = col + 1; row < 8; row++) if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    if (Math.abs(rows[pivot][col]) < EPS) throw new Error('Perspective transform is unstable. Adjust the corners or choose another photo.');
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    const divisor = rows[col][col];
    for (let j = col; j <= 8; j++) rows[col][j] /= divisor;
    for (let row = 0; row < 8; row++) {
      if (row === col) continue;
      const factor = rows[row][col];
      for (let j = col; j <= 8; j++) rows[row][j] -= factor * rows[col][j];
    }
  }
  const h = [...rows.map(row => row[8]), 1];
  const denominators = source.map(([x, y]) => h[6] * x + h[7] * y + 1);
  if (denominators.some(d => d < 1e-5) || Math.max(...denominators) / Math.min(...denominators) > 1000)
    throw new Error('Perspective is too extreme for a reliable preview. Choose another photo.');
  return h;
}

export function transformPoint(h: Homography, x: number, y: number): PointNorm {
  const d = h[6] * x + h[7] * y + h[8];
  if (!Number.isFinite(d) || Math.abs(d) < EPS) throw new Error('Point cannot be projected reliably.');
  const u = (h[0] * x + h[1] * y + h[2]) / d;
  const v = (h[3] * x + h[4] * y + h[5]) / d;
  if (!Number.isFinite(u) || !Number.isFinite(v)) throw new Error('Projection produced invalid coordinates.');
  return { u, v };
}

export function projectDots(dots: DotMm[], diameterMm: number, widthMm: number, heightMm: number, corners: CornersNorm): ProjectedDot[] {
  if (![diameterMm, widthMm, heightMm].every(v => Number.isFinite(v) && v > 0)) throw new Error('Projection dimensions must be positive.');
  const h = makeHomography(corners), radius = diameterMm / 2;
  const offsets = Array.from({ length: 48 }, (_, i) => {
    const angle = i * Math.PI * 2 / 48;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });
  return dots.map(dot => ({
    dotId: dot.id,
    centerNorm: transformPoint(h, dot.xMm / widthMm, dot.yMm / heightMm),
    // 48 samples give <0.22% radial approximation error in the physical plane.
    outlineNorm: offsets.map(offset => transformPoint(h, (dot.xMm + offset.x) / widthMm, (dot.yMm + offset.y) / heightMm)),
  }));
}

/** Projects a shaped pane's physical outline onto the photo with the same homography as the dots. */
export function projectOutline(outlineMm: PointMm[], widthMm: number, heightMm: number, corners: CornersNorm): PointNorm[] {
  const h = makeHomography(corners);
  return outlineMm.map(p => transformPoint(h, p.xMm / widthMm, p.yMm / heightMm));
}

/** Map pointer into a contain-fitted image. Return null for letterbox clicks. */
export function pointerToNorm(clientX: number, clientY: number, bounds: { left: number; top: number; width: number; height: number }, imageWidth: number, imageHeight: number): PointNorm | null {
  if (bounds.width <= 0 || bounds.height <= 0 || imageWidth <= 0 || imageHeight <= 0) return null;
  const scale = Math.min(bounds.width / imageWidth, bounds.height / imageHeight);
  const width = imageWidth * scale, height = imageHeight * scale;
  const u = (clientX - bounds.left - (bounds.width - width) / 2) / width;
  const v = (clientY - bounds.top - (bounds.height - height) / 2) / height;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null;
}
