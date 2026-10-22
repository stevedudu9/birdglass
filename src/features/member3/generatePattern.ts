import { LIMITS } from '../member2/model';
import type { GuidelineProfile, LayoutRequest, LayoutResult } from '../member2/types';
import { ALGORITHM_VERSION, checkPatternInputs } from './rules';
import { validatePattern } from './validatePattern';
import { gridMetrics, paneLimitMessage } from './grid';
import { generateShapedDots } from './shapedPattern';

export function generatePattern(request: LayoutRequest, guideline: GuidelineProfile): LayoutResult {
  checkPatternInputs(request, guideline);
  if (request.outlineMm) return generateShaped(request, guideline);
  const { widthMm, heightMm } = request;
  const diameter = guideline.dotDiameterMm;
  const pitch = guideline.targetCenterPitchXmm;
  // A row of n dots spans (n - 1) * pitch + diameter, including the outer radii.
  const { columns, rows, startXmm: startX, startYmm: startY } = gridMetrics(widthMm, heightMm);
  if (rows * columns > LIMITS.dots) {
    throw new Error(paneLimitMessage(rows * columns));
  }
  const dotsMm: LayoutResult['dotsMm'] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      dotsMm.push({ id: `r${row + 1}c${column + 1}`, xMm: startX + column * pitch, yMm: startY + row * pitch });
    }
  }
  const layout: LayoutResult = {
    windowId: request.windowId, dimensionRevision: request.dimensionRevision,
    guidelineId: request.guidelineId, guidelineVersion: request.guidelineVersion,
    layoutVersion: crypto.randomUUID(), algorithmVersion: ALGORITHM_VERSION,
    rows, columns, dotCount: dotsMm.length, dotDiameterMm: diameter,
    actualCenterPitchXmm: columns === 1 ? null : pitch,
    actualCenterPitchYmm: rows === 1 ? null : pitch,
    dotsMm, validation: { status: 'incomplete', issues: [] },
  };
  const check = validatePattern(layout, request, guideline);
  layout.validation = { status: check.status, issues: [...check.issues, ...check.pending] };
  return layout;
}

function generateShaped(request: LayoutRequest, guideline: GuidelineProfile): LayoutResult {
  const { dots, grid, edgeDotCount } = generateShapedDots(request, guideline);
  if (!dots.length) throw new Error('No complete 10 mm dot fits inside this glass outline. Check the shape and measurements.');
  const pitch = guideline.targetCenterPitchXmm;
  const lattice = dots.filter(dot => dot.id.startsWith('r'));
  const columns = new Set(lattice.map(dot => dot.xMm)).size, rows = new Set(lattice.map(dot => dot.yMm)).size;
  const layout: LayoutResult = {
    windowId: request.windowId, dimensionRevision: request.dimensionRevision,
    guidelineId: request.guidelineId, guidelineVersion: request.guidelineVersion,
    layoutVersion: crypto.randomUUID(), algorithmVersion: ALGORITHM_VERSION,
    // Rows and columns describe the bounding 50 mm lattice; dotCount is the clipped total.
    rows: grid.rows, columns: grid.columns, dotCount: dots.length, dotDiameterMm: guideline.dotDiameterMm,
    actualCenterPitchXmm: columns > 1 ? pitch : null, actualCenterPitchYmm: rows > 1 ? pitch : null,
    dotsMm: dots, validation: { status: 'incomplete', issues: [] },
    shape: { kind: request.shapeKind!, outlineMm: request.outlineMm!, edgeDotCount },
  };
  const check = validatePattern(layout, request, guideline);
  layout.validation = { status: check.status, issues: [...check.issues, ...check.pending] };
  return layout;
}
