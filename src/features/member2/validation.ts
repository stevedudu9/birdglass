import { LIMITS } from './model';
import { OutlineIndex, sameOutline } from './outline';
import type { GuidelineProfile, LayoutCheck, LayoutResult, WindowInput } from './types';

const positive = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** Runtime adapter: unknown JSON is never trusted just because a TS interface exists. */
export function parseLayout(value: unknown): LayoutResult {
  if (!record(value)) throw new Error('Layout must be a JSON object.');
  for (const key of ['windowId', 'guidelineId', 'guidelineVersion', 'layoutVersion', 'algorithmVersion'])
    if (!text(value[key])) throw new Error(`Layout is missing ${key}.`);
  if (!Number.isSafeInteger(value.dimensionRevision) || Number(value.dimensionRevision) < 0) throw new Error('Invalid dimensionRevision.');
  for (const key of ['rows', 'columns', 'dotCount'])
    if (!Number.isSafeInteger(value[key]) || Number(value[key]) < 1 || Number(value[key]) > LIMITS.dots) throw new Error(`${key} must be an integer from 1 to ${LIMITS.dots}.`);
  if (!positive(value.dotDiameterMm)) throw new Error('Dot diameter must be positive millimetres.');
  for (const key of ['actualCenterPitchXmm', 'actualCenterPitchYmm'])
    if (value[key] !== null && !positive(value[key])) throw new Error(`${key} must be a positive number or null.`);
  if (!Array.isArray(value.dotsMm) || value.dotsMm.length > LIMITS.dots || value.dotsMm.length !== value.dotCount) throw new Error(`dotCount must match dotsMm, with no more than ${LIMITS.dots.toLocaleString('en-MY')} dots.`);
  if (value.dotsMm.some(dot => !record(dot) || !text(dot.id) || !finite(dot.xMm) || !finite(dot.yMm))) throw new Error('Each dot needs an ID and finite xMm / yMm coordinates.');
  if (new Set(value.dotsMm.map(dot => dot.id)).size !== value.dotsMm.length) throw new Error('Dot IDs must be unique.');
  if (!record(value.validation) || !['pass', 'fail', 'incomplete'].includes(String(value.validation.status)) || !Array.isArray(value.validation.issues) || value.validation.issues.some(v => typeof v !== 'string'))
    throw new Error('Layout must include validation status and issues.');
  return value as unknown as LayoutResult;
}

function axis(values: number[], tolerance: number): number[] {
  const sorted = [...values].sort((a, b) => a - b), unique: number[] = [];
  for (const value of sorted) if (!unique.length || Math.abs(value - unique[unique.length - 1]) > tolerance) unique.push(value);
  return unique;
}

/** First matching sorted coordinate, preserving the validator's absolute tolerance. */
export function findAxisPosition(points: number[], value: number, tolerance: number): number {
  let low = 0, high = points.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle] < value - tolerance) low = middle + 1;
    else high = middle;
  }
  return low < points.length && Math.abs(points[low] - value) <= tolerance ? low : -1;
}

export function validateLayout(layoutValue: unknown, input: WindowInput, guideline: GuidelineProfile): LayoutCheck {
  const issues: string[] = [], pending: string[] = [];
  if (![input.widthMm,input.heightMm].every(positive)) return {status:'fail',geometryPassed:false,issues:['Measured dimensions must be finite and positive.'],pending};
  let layout: LayoutResult;
  try { layout = parseLayout(layoutValue); }
  catch (error) { return { status: 'fail', geometryPassed: false, issues: [(error as Error).message], pending }; }
  if (layout.windowId !== input.windowId || layout.dimensionRevision !== input.dimensionRevision) issues.push('Layout belongs to another window or an outdated dimension revision.');
  if (layout.guidelineId !== guideline.id || layout.guidelineVersion !== guideline.version) issues.push('Layout uses a different guideline or guideline version.');
  if (!positive(guideline.dotDiameterMm) || Math.abs(layout.dotDiameterMm - guideline.dotDiameterMm) > 1e-8) issues.push('Dot diameter differs from the selected guideline.');
  // Keep the algorithm's own reasons visible so the user knows what to correct.
  if (layout.validation.status === 'fail') issues.push('The algorithm reported a failed layout.', ...layout.validation.issues.filter(message => !/await(s)? team review|pending research/.test(message)).slice(0, 3));
  if (layout.validation.status === 'incomplete') pending.push('The algorithm reports incomplete checks.');
  const radius = layout.dotDiameterMm / 2;
  const tolerance = Math.max(input.widthMm, input.heightMm, 1) * 1e-8;
  if (input.outlineMm || layout.shape) return checkShapedAdapter(layout, input, guideline, issues, pending, radius, tolerance);
  if (layout.dotsMm.some(p => p.xMm - radius < -tolerance || p.yMm - radius < -tolerance || p.xMm + radius > input.widthMm + tolerance || p.yMm + radius > input.heightMm + tolerance))
    issues.push('A dot extends outside the measured glass boundary.');
  const xs = axis(layout.dotsMm.map(p => p.xMm), tolerance), ys = axis(layout.dotsMm.map(p => p.yMm), tolerance);
  if (xs.length !== layout.columns || ys.length !== layout.rows || layout.rows * layout.columns !== layout.dotCount)
    issues.push('This adapter requires a complete rectangular grid matching rows, columns and dotCount.');
  const cells = new Set(layout.dotsMm.map(p => `${findAxisPosition(xs, p.xMm, tolerance)}:${findAxisPosition(ys, p.yMm, tolerance)}`));
  if (cells.size !== layout.dotCount) issues.push('Multiple dots occupy the same grid position.');

  function checkAxis(points: number[], reported: number | null, maxPitch: number | undefined, maxGap: number | undefined, name: string) {
    const gaps = points.slice(1).map((p, i) => p - points[i]);
    if (points.length === 1 && reported !== null) issues.push(`${name} pitch must be null for a single row or column.`);
    if (gaps.length && (reported === null || gaps.some(gap => Math.abs(gap - reported) > tolerance))) issues.push(`${name} pitch metadata does not match a regular grid.`);
    if (gaps.some(gap => gap + tolerance < layout.dotDiameterMm)) issues.push(`${name} dots overlap.`);
    if (maxPitch !== undefined && !positive(maxPitch)) issues.push(`${name} maximum centre pitch is invalid.`);
    else if (maxPitch !== undefined && gaps.some(gap => gap > maxPitch + tolerance)) issues.push(`${name} centre pitch exceeds the selected maximum.`);
    if (maxGap !== undefined && (!finite(maxGap) || maxGap < 0)) issues.push(`${name} maximum clear gap is invalid.`);
    else if (maxGap !== undefined && gaps.some(gap => gap - layout.dotDiameterMm > maxGap + tolerance)) issues.push(`${name} clear gap exceeds the selected maximum.`);
    if (maxPitch === undefined && maxGap === undefined) pending.push(`${name} maximum spacing has not been supplied.`);
  }
  checkAxis(xs, layout.actualCenterPitchXmm, guideline.maxCenterPitchXmm, guideline.maxClearGapXmm, 'Horizontal');
  checkAxis(ys, layout.actualCenterPitchYmm, guideline.maxCenterPitchYmm, guideline.maxClearGapYmm, 'Vertical');
  if (guideline.fixedCenterPitch) {
    if (xs.length > 1 && Math.abs((layout.actualCenterPitchXmm ?? 0) - guideline.targetCenterPitchXmm) > tolerance) issues.push('Horizontal pitch must match the fixed baseline.');
    if (ys.length > 1 && Math.abs((layout.actualCenterPitchYmm ?? 0) - guideline.targetCenterPitchYmm) > tolerance) issues.push('Vertical pitch must match the fixed baseline.');
  }
  if (guideline.maxBoundaryClearGapMm === undefined) pending.push('Maximum boundary gap has not been supplied.');
  else if (!finite(guideline.maxBoundaryClearGapMm) || guideline.maxBoundaryClearGapMm < 0) issues.push('Maximum boundary gap is invalid.');
  else if (guideline.boundaryDefinition !== 'glass-edge-to-dot-edge') pending.push('Boundary-gap definition is not supported by this validator.');
  else if ([xs[0] - radius, input.widthMm - xs[xs.length - 1] - radius, ys[0] - radius, input.heightMm - ys[ys.length - 1] - radius].some(gap => gap > guideline.maxBoundaryClearGapMm! + tolerance))
    issues.push('Boundary gap exceeds the selected maximum.');
  if (guideline.coverageRule !== 'full-rectangular-grid') pending.push('Coverage rule has not been implemented or confirmed.');
  if (guideline.status !== 'reviewed' || !guideline.sources.length) pending.push('Research parameters and sources await team review.');
  if (layout.validation.status === 'incomplete') pending.push(...layout.validation.issues);
  return { status: issues.length ? 'fail' : pending.length ? 'incomplete' : 'pass', geometryPassed: !issues.length, issues, pending: [...new Set(pending)] };
}

/** Shaped panes: the algorithm's clipped grid is checked against the outline here, and its
 * spacing and edge coverage are re-measured by the pattern validator (validatePattern). */
function checkShapedAdapter(layout: LayoutResult, input: WindowInput, guideline: GuidelineProfile, issues: string[], pending: string[], radius: number, tolerance: number): LayoutCheck {
  if (!input.outlineMm || !layout.shape || layout.shape.kind !== input.shapeKind || !sameOutline(layout.shape.outlineMm, input.outlineMm))
    issues.push('Layout was generated for a different glass shape.');
  else {
    const outline = new OutlineIndex(input.outlineMm);
    if (layout.dotsMm.some(p => !outline.fits({ xMm: p.xMm, yMm: p.yMm }, radius, Math.max(tolerance, 1e-7)))) issues.push('A dot extends outside the measured glass outline.');
  }
  const sorted = [...layout.dotsMm].sort((a, b) => a.xMm - b.xMm);
  for (let i = 0; i < sorted.length && !issues.includes('Dots overlap.'); i++)
    for (let j = i + 1; j < sorted.length && sorted[j].xMm - sorted[i].xMm < layout.dotDiameterMm; j++)
      if (Math.hypot(sorted[j].xMm - sorted[i].xMm, sorted[j].yMm - sorted[i].yMm) + tolerance < layout.dotDiameterMm) { issues.push('Dots overlap.'); break; }
  if (guideline.fixedCenterPitch) {
    if (layout.actualCenterPitchXmm !== null && Math.abs(layout.actualCenterPitchXmm - guideline.targetCenterPitchXmm) > tolerance) issues.push('Horizontal pitch must match the fixed baseline.');
    if (layout.actualCenterPitchYmm !== null && Math.abs(layout.actualCenterPitchYmm - guideline.targetCenterPitchYmm) > tolerance) issues.push('Vertical pitch must match the fixed baseline.');
  }
  if (guideline.status !== 'reviewed' || !guideline.sources.length) pending.push('Research parameters and sources await team review.');
  if (layout.validation.status === 'incomplete') pending.push(...layout.validation.issues);
  return { status: issues.length ? 'fail' : pending.length ? 'incomplete' : 'pass', geometryPassed: !issues.length, issues, pending: [...new Set(pending)] };
}
