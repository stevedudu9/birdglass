import { LIMITS } from '../member2/model';
import type { GuidelineProfile, LayoutRequest } from '../member2/types';

export const ALGORITHM_VERSION = 'member3-fixed-grid-1.2.0';
export const MEASUREMENT_TOLERANCE_MM = 1e-7;

/** This implementation supports the agreed 10 mm / 50 mm baseline only. */
export function checkPatternInputs(request: LayoutRequest, guideline: GuidelineProfile): void {
  for (const key of ['windowId', 'guidelineId', 'guidelineVersion'] as const) {
    if (typeof request[key] !== 'string' || !request[key].trim()) {
      throw new Error(`${key} must be a non-empty string.`);
    }
  }
  if (!Number.isSafeInteger(request.dimensionRevision) || request.dimensionRevision < 0) {
    throw new Error('dimensionRevision must be a non-negative integer.');
  }
  if (request.guidelineId !== guideline.id || request.guidelineVersion !== guideline.version) {
    throw new Error('The requested guideline identifiers do not match the supplied profile.');
  }
  for (const size of [request.widthMm, request.heightMm]) {
    if (!Number.isFinite(size) || size < 10 || size > LIMITS.dimensionMm) {
      throw new Error('Each pane dimension must be between 10 and 100,000 mm to fit a complete dot. Check the measured glass size and unit.');
    }
  }
  if (guideline.dotDiameterMm !== 10 || guideline.markerColor !== 'white'
      || guideline.targetCenterPitchXmm !== 50 || guideline.targetCenterPitchYmm !== 50
      || guideline.fixedCenterPitch !== true || guideline.coverageRule !== 'full-rectangular-grid') {
    throw new Error('This algorithm requires white 10 mm dots and a complete grid at fixed 50 × 50 mm centre spacing.');
  }
  for (const [limit, value] of [
    [guideline.maxCenterPitchXmm, 50], [guideline.maxCenterPitchYmm, 50],
    [guideline.maxClearGapXmm, 40], [guideline.maxClearGapYmm, 40],
  ]) {
    if (limit !== value) throw new Error('The profile must retain the agreed 50 mm pitch and 40 mm adjacent-gap limits.');
  }
  if (request.outlineMm !== undefined && (!Array.isArray(request.outlineMm) || request.outlineMm.length < 3
      || !['arch', 'raked', 'custom'].includes(String(request.shapeKind)))) {
    throw new Error('A shaped pane needs a supported shape kind and an outline of at least three points.');
  }
  if (guideline.maxBoundaryClearGapMm !== undefined
      && (!Number.isFinite(guideline.maxBoundaryClearGapMm) || guideline.maxBoundaryClearGapMm < 0)) {
    throw new Error('The boundary limit must be a finite, non-negative distance.');
  }
}
