import { parseLayout } from '../member2/validation';
import { polygonArea } from '../member2/outline';
import type { GuidelineProfile, LayoutRequest } from '../member2/types';
import { validatePattern } from './validatePattern';
import type { PatternCheck } from './validatePattern';

export type MaterialQuantities = {
  windowId: string; dimensionRevision: number; layoutVersion: string;
  guidelineId: string; guidelineVersion: string; dotCount: number;
  windowAreaM2: number; boundingAreaM2: number; oneMarkerAreaM2: number; totalMarkerAreaM2: number;
  markedAreaPercent: number; validationStatus: PatternCheck['status'];
};

/** Physical quantities only. Member 1 owns prices, purchasing units and wastage. */
export function calculateQuantities(request: LayoutRequest, value: unknown, guideline: GuidelineProfile): MaterialQuantities {
  const check = validatePattern(value, request, guideline);
  if (!check.geometryPassed) throw new Error(check.issues.join(' '));
  const layout = parseLayout(value);
  const boundingAreaM2 = request.widthMm * request.heightMm / 1_000_000;
  // Shaped panes use the actual glass outline, never the bounding rectangle.
  const windowAreaM2 = request.outlineMm ? Math.abs(polygonArea(request.outlineMm)) / 1_000_000 : boundingAreaM2;
  const oneMarkerAreaM2 = Math.PI * (guideline.dotDiameterMm / 2) ** 2 / 1_000_000;
  const totalMarkerAreaM2 = layout.dotsMm.length * oneMarkerAreaM2;
  return {
    windowId: request.windowId, dimensionRevision: request.dimensionRevision,
    layoutVersion: layout.layoutVersion, guidelineId: request.guidelineId, guidelineVersion: request.guidelineVersion,
    dotCount: layout.dotsMm.length, windowAreaM2, boundingAreaM2, oneMarkerAreaM2, totalMarkerAreaM2,
    markedAreaPercent: totalMarkerAreaM2 / windowAreaM2 * 100, validationStatus: check.status,
  };
}
