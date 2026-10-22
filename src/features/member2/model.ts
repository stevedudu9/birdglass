import { validateCorners } from './geometry';
import { polygonArea, readOutline, sameOutline } from './outline';
import type { CornersNorm, DimensionEntry, ImageAsset, LayoutRequest, LayoutResult, GuidelineProfile, OutlineShapeKind, PointMm, ShapeEntry, WindowDraft, WindowInput } from './types';

export const LIMITS = { fileBytes: 12 * 1024 * 1024, decodedPixels: 24_000_000, imageEdge: 12_000, previewEdge: 2560, dots: 10000, windows: 8, dimensionMm: 100_000 };
export const PREVIEW_NOTICE = 'Illustrative preview; not a scale installation template.';

export const toMm = (value: number, factor: number) => Math.round(value * factor * 1e6) / 1e6;

export function readDimensions(entry: DimensionEntry): { widthMm: number; heightMm: number } {
  const factor = { mm: 1, cm: 10, m: 1000 }[entry.unit];
  if (!factor || !entry.width.trim() || !entry.height.trim()) throw new Error('Enter the measured width and height of the glass.');
  // Round to the micrometre: 2.01 m × 1000 is 2009.9999999999998 in floating point,
  // which would otherwise drop a whole row or column at a 50 mm threshold.
  const values = [entry.width, entry.height].map(v => toMm(Number(v), factor));
  if (values.some(v => !Number.isFinite(v) || v <= 0)) throw new Error('Width and height must be finite numbers greater than zero.');
  if (values.some(v => v > LIMITS.dimensionMm)) throw new Error('This prototype supports dimensions up to 100,000 mm (a software limit).');
  return { widthMm: values[0], heightMm: values[1] };
}

/** Null outline = rectangle. Throws for an invalid shape so the editor can explain it. */
export function readShape(draft: Pick<WindowDraft, 'dimensions' | 'shape'>): { widthMm: number; heightMm: number; kind: OutlineShapeKind | null; outlineMm: PointMm[] | null } {
  const dimensions = readDimensions(draft.dimensions);
  const outlineMm = readOutline(draft.shape, draft.dimensions.unit, dimensions.widthMm, dimensions.heightMm);
  return { ...dimensions, kind: outlineMm ? draft.shape!.kind as OutlineShapeKind : null, outlineMm };
}
/** Actual glass area: the outline area for shaped panes, otherwise width × height. */
export function glassAreaMm2(draft: Pick<WindowDraft, 'dimensions' | 'shape'>): number {
  const shape = readShape(draft);
  return shape.outlineMm ? Math.abs(polygonArea(shape.outlineMm)) : shape.widthMm * shape.heightMm;
}
export function setShape(draft: WindowDraft, shape: ShapeEntry): WindowDraft {
  return { ...draft, shape, dimensionRevision: draft.dimensionRevision + 1, layout: null };
}

export function createWindow(label: string, buildingId = 'building-demo'): WindowDraft {
  return { windowId: crypto.randomUUID(), buildingId, label, image: null, corners: {},
    dimensions: { width: '', height: '', unit: 'cm' }, dimensionRevision: 0, photoRevision: 0, layout: null };
}

export function setDimensions(draft: WindowDraft, dimensions: DimensionEntry): WindowDraft {
  return { ...draft, dimensions, dimensionRevision: draft.dimensionRevision + 1, layout: null };
}
export function setCorners(draft: WindowDraft, corners: Partial<CornersNorm>): WindowDraft {
  return { ...draft, corners, photoRevision: draft.photoRevision + 1 };
}
export function setImage(draft: WindowDraft, image: ImageAsset): WindowDraft {
  return { ...draft, image, corners: {}, layout: null, photoRevision: draft.photoRevision + 1, dimensionRevision: draft.dimensionRevision + 1 };
}
export function buildWindowInput(draft: WindowDraft): WindowInput {
  if (!draft.image) throw new Error('Upload a window photo first.');
  if (![draft.windowId,draft.buildingId,draft.image.imageId].every(id=>typeof id==='string'&&id.trim())) throw new Error('Window, building and image IDs are required.');
  if (!draft.image.orientationNormalized || ![draft.image.widthPx,draft.image.heightPx].every(v=>Number.isSafeInteger(v)&&v>=32&&v<=LIMITS.imageEdge)) throw new Error('Use a valid orientation-normalized base image.');
  if (draft.image.widthPx*draft.image.heightPx>LIMITS.decodedPixels) throw new Error('The normalized base image exceeds the 24 megapixel limit.');
  if (!/^data:image\/(png|jpeg);base64,/.test(draft.image.dataUrl)) throw new Error('The normalized image asset is missing.');
  if (![draft.dimensionRevision,draft.photoRevision].every(v=>Number.isSafeInteger(v)&&v>=0)) throw new Error('Window revisions must be non-negative integers.');
  const issues = validateCorners(draft.corners);
  if (issues.length) throw new Error(issues[0]);
  const { kind, outlineMm, ...dimensions } = readShape(draft);
  return { schemaVersion: '0.1', buildingId: draft.buildingId, windowId: draft.windowId, label: draft.label,
    imageId: draft.image.imageId, imageWidthPx: draft.image.widthPx, imageHeightPx: draft.image.heightPx,
    imageOrientationNormalized: true, cornersNorm: draft.corners as CornersNorm,
    ...dimensions, dimensionRevision: draft.dimensionRevision, photoRevision: draft.photoRevision,
    ...(outlineMm ? { shapeKind: kind!, outlineMm } : {}) };
}
export function buildLayoutRequest(draft: WindowDraft, guideline: GuidelineProfile): LayoutRequest {
  const input = buildWindowInput(draft);
  return { windowId: input.windowId, dimensionRevision: input.dimensionRevision,
    widthMm: input.widthMm, heightMm: input.heightMm, guidelineId: guideline.id, guidelineVersion: guideline.version,
    ...(input.outlineMm ? { shapeKind: input.shapeKind, outlineMm: input.outlineMm } : {}) };
}
export function requestIsCurrent(draft: WindowDraft, request: LayoutRequest, guideline: GuidelineProfile): boolean {
  if (draft.windowId !== request.windowId || draft.dimensionRevision !== request.dimensionRevision || guideline.id !== request.guidelineId || guideline.version !== request.guidelineVersion) return false;
  try {
    const dims = readShape(draft);
    return dims.widthMm === request.widthMm && dims.heightMm === request.heightMm && sameOutline(dims.outlineMm, request.outlineMm, 0);
  } catch { return false; }
}
export function acceptLayout(draft: WindowDraft, request: LayoutRequest, layout: LayoutResult, guideline: GuidelineProfile): WindowDraft {
  return requestIsCurrent(draft, request, guideline) && layout.windowId === draft.windowId && layout.dimensionRevision === draft.dimensionRevision
    && layout.guidelineId === guideline.id && layout.guidelineVersion === guideline.version ? { ...draft, layout } : draft;
}
