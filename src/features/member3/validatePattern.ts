import { findAxisPosition, parseLayout } from '../member2/validation';
import type { GuidelineProfile, LayoutCheck, LayoutRequest, LayoutResult } from '../member2/types';
import { checkPatternInputs, MEASUREMENT_TOLERANCE_MM as tolerance } from './rules';
import { checkShapedLayout } from './shapedPattern';
import type { ShapedMeasurements } from './shapedPattern';

export const SHAPED_REVIEW_MESSAGE = 'Irregular-shape edge coverage uses the derived BG-EDGE-002 rule, which awaits team review.';

export type PatternMeasurements = {
  maxCenterPitchXmm: number | null;
  maxCenterPitchYmm: number | null;
  maxClearGapXmm: number | null;
  maxClearGapYmm: number | null;
  boundaryClearGapsMm: { left: number; right: number; top: number; bottom: number };
  /** Shaped panes only. */
  shaped?: ShapedMeasurements;
};
export type PatternCheck = LayoutCheck & { measurements: PatternMeasurements | null };

function distinctPositions(values: number[]): number[] {
  const result: number[] = [];
  for (const value of [...values].sort((a, b) => a - b)) {
    if (!result.length || Math.abs(value - result[result.length - 1]) > tolerance) result.push(value);
  }
  return result;
}

/** Re-measure the coordinates; never trust a saved pass label or count. */
export function validatePattern(value: unknown, request: LayoutRequest, guideline: GuidelineProfile): PatternCheck {
  const issues: string[] = [], pending: string[] = [];
  let layout: LayoutResult;
  try {
    checkPatternInputs(request, guideline);
    layout = parseLayout(value);
  } catch (error) {
    return { status: 'fail', geometryPassed: false, issues: [(error as Error).message], pending, measurements: null };
  }
  if (layout.windowId !== request.windowId || layout.dimensionRevision !== request.dimensionRevision) {
    issues.push('The layout belongs to another window or dimension revision.');
  }
  if (layout.guidelineId !== request.guidelineId || layout.guidelineVersion !== request.guidelineVersion) {
    issues.push('The layout guideline identifiers do not match the request.');
  }
  if (layout.dotDiameterMm !== guideline.dotDiameterMm) issues.push('Dot diameter must be 10 mm.');
  if (request.outlineMm) return validateShaped(layout, request, guideline, issues, pending);
  if (layout.shape) issues.push('A shaped layout cannot be used for a rectangular pane.');

  // Use the agreed physical radius even if the returned diameter was forged.
  const radius = guideline.dotDiameterMm / 2;
  const xs = distinctPositions(layout.dotsMm.map(dot => dot.xMm));
  const ys = distinctPositions(layout.dotsMm.map(dot => dot.yMm));
  if (layout.dotsMm.some(dot => dot.xMm < radius - tolerance || dot.yMm < radius - tolerance
      || dot.xMm > request.widthMm - radius + tolerance || dot.yMm > request.heightMm - radius + tolerance)) {
    issues.push('A complete dot extends outside the glass.');
  }
  if (xs.length !== layout.columns || ys.length !== layout.rows || xs.length * ys.length !== layout.dotCount) {
    issues.push('Rows, columns and dot count must describe a complete rectangular grid.');
  }
  const cells = new Set(layout.dotsMm.map(dot => {
    const column = findAxisPosition(xs, dot.xMm, tolerance);
    const row = findAxisPosition(ys, dot.yMm, tolerance);
    return `${column}:${row}`;
  }));
  if (cells.size !== layout.dotCount) issues.push('Multiple dots occupy the same grid position.');

  function measureAxis(positions: number[], reportedPitch: number | null, name: string) {
    if (positions.length === 1) {
      if (reportedPitch !== null) issues.push(`${name} pitch must be null when there are no neighbouring dots.`);
      return { pitch: null, clearGap: null };
    }
    const steps = positions.slice(1).map((position, index) => position - positions[index]);
    if (steps.some(step => Math.abs(step - 50) > tolerance)) issues.push(`${name} centre spacing must remain 50 mm.`);
    if (reportedPitch === null || steps.some(step => Math.abs(step - reportedPitch) > tolerance)) {
      issues.push(`${name} reported pitch does not match the coordinates.`);
    }
    return { pitch: Math.max(...steps), clearGap: Math.max(...steps) - guideline.dotDiameterMm };
  }
  const horizontal = measureAxis(xs, layout.actualCenterPitchXmm, 'Horizontal');
  const vertical = measureAxis(ys, layout.actualCenterPitchYmm, 'Vertical');
  const boundaries = {
    left: xs[0] - radius, right: request.widthMm - xs[xs.length - 1] - radius,
    top: ys[0] - radius, bottom: request.heightMm - ys[ys.length - 1] - radius,
  };
  if (Math.abs(boundaries.left - boundaries.right) > tolerance || Math.abs(boundaries.top - boundaries.bottom) > tolerance) {
    issues.push('The grid must be centred with equal opposite margins.');
  }
  // Another full row/column fitting means the current plan leaves out usable grid positions.
  if (xs.length * 50 + 10 <= request.widthMm || ys.length * 50 + 10 <= request.heightMm) {
    issues.push('The grid omits a row or column that fits at the fixed spacing.');
  }
  if (guideline.maxBoundaryClearGapMm === undefined) {
    pending.push('Maximum glass-edge-to-dot-edge boundary gap is pending research confirmation.');
  } else if (guideline.boundaryDefinition !== 'glass-edge-to-dot-edge') {
    pending.push('The supplied boundary definition is not supported.');
  } else if (Object.values(boundaries).some(gap => gap > guideline.maxBoundaryClearGapMm! + tolerance)) {
    issues.push('A boundary clear gap exceeds the supplied maximum.');
  }
  if (guideline.status !== 'reviewed' || !guideline.sources.length) {
    pending.push('The guideline profile and sources await team review.');
  }
  return {
    status: issues.length ? 'fail' : pending.length ? 'incomplete' : 'pass',
    geometryPassed: issues.length === 0, issues, pending,
    measurements: {
      maxCenterPitchXmm: horizontal.pitch, maxCenterPitchYmm: vertical.pitch,
      maxClearGapXmm: horizontal.clearGap, maxClearGapYmm: vertical.clearGap,
      boundaryClearGapsMm: boundaries,
    },
  };
}

function validateShaped(layout: LayoutResult, request: LayoutRequest, guideline: GuidelineProfile, issues: string[], pending: string[]): PatternCheck {
  const radius = guideline.dotDiameterMm / 2;
  const shaped = checkShapedLayout(layout, request, guideline, tolerance);
  issues.push(...shaped.issues);
  if (layout.dotCount !== layout.dotsMm.length) issues.push('Dot count does not match the coordinates.');
  const xs = layout.dotsMm.map(dot => dot.xMm), ys = layout.dotsMm.map(dot => dot.yMm);
  if (guideline.maxBoundaryClearGapMm === undefined) pending.push('Maximum glass-edge-to-dot-edge boundary gap is pending research confirmation.');
  pending.push(SHAPED_REVIEW_MESSAGE);
  if (guideline.status !== 'reviewed' || !guideline.sources.length) pending.push('The guideline profile and sources await team review.');
  const pitchX = layout.actualCenterPitchXmm, pitchY = layout.actualCenterPitchYmm;
  return {
    status: issues.length ? 'fail' : pending.length ? 'incomplete' : 'pass',
    geometryPassed: issues.length === 0, issues, pending,
    measurements: {
      maxCenterPitchXmm: pitchX, maxCenterPitchYmm: pitchY,
      maxClearGapXmm: pitchX === null ? null : pitchX - guideline.dotDiameterMm,
      maxClearGapYmm: pitchY === null ? null : pitchY - guideline.dotDiameterMm,
      // Bounding-box gaps are informational for shaped panes; BG-EDGE-002 is the edge check.
      boundaryClearGapsMm: xs.length ? {
        left: Math.min(...xs) - radius, right: request.widthMm - Math.max(...xs) - radius,
        top: Math.min(...ys) - radius, bottom: request.heightMm - Math.max(...ys) - radius,
      } : { left: 0, right: 0, top: 0, bottom: 0 },
      shaped: shaped.measurements,
    },
  };
}
