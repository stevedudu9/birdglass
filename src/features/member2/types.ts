import type { MaterialSelection } from '../materials/types';
import type { ScreeningRecord } from '../screening/assessment';
export type PointNorm = { u: number; v: number };
export const CORNER_KEYS = ['tl', 'tr', 'br', 'bl'] as const;
export type CornerKey = typeof CORNER_KEYS[number];
export type CornersNorm = Record<CornerKey, PointNorm>;
export type Unit = 'mm' | 'cm' | 'm';
export type DimensionEntry = { width: string; height: string; unit: Unit };
export type PointMm = { xMm: number; yMm: number };
export type ShapeKind = 'rectangle' | 'arch' | 'raked' | 'custom';
export type OutlineShapeKind = Exclude<ShapeKind, 'rectangle'>;
/** Glass shape inside the measured width × height box. Lengths use the dimension unit. */
export type ShapeEntry = { kind: ShapeKind; rise?: string; shortSide?: 'left' | 'right'; shortHeight?: string; points?: string };
export type SourceRef = { url: string; title: string; checkedOn: string; locator?: string };
export type GuidelineProfile = {
  id: string; version: string; name: string; status: 'draft' | 'reviewed';
  dotDiameterMm: number; targetCenterPitchXmm: number; targetCenterPitchYmm: number;
  fixedCenterPitch?: boolean; markerColor?: 'white';
  maxCenterPitchXmm?: number; maxCenterPitchYmm?: number;
  maxClearGapXmm?: number; maxClearGapYmm?: number; maxBoundaryClearGapMm?: number;
  boundaryDefinition: string; coverageRule: string;
  installationConditions: string[]; sources: SourceRef[];
};
export type ImageAsset = {
  imageId: string; name: string; dataUrl: string; widthPx: number; heightPx: number;
  orientationNormalized: true; kind: 'photo' | 'illustration';
  /** Optional lightweight copy of the same complete image; coordinates always use the full-resolution basis above. */
  preview?: { dataUrl: string; widthPx: number; heightPx: number };
};
export type WindowInput = {
  schemaVersion: '0.1'; buildingId: string; windowId: string; label: string;
  imageId: string; imageWidthPx: number; imageHeightPx: number;
  imageOrientationNormalized: true; cornersNorm: CornersNorm;
  widthMm: number; heightMm: number; dimensionRevision: number; photoRevision: number;
  /** Non-rectangular glass only: outline inside the width × height box. */
  shapeKind?: OutlineShapeKind; outlineMm?: PointMm[];
};
export type DotMm = { id: string; xMm: number; yMm: number };
export type LayoutResult = {
  windowId: string; dimensionRevision: number; guidelineId: string; guidelineVersion: string;
  layoutVersion: string; algorithmVersion: string; rows: number; columns: number;
  dotDiameterMm: number; actualCenterPitchXmm: number | null; actualCenterPitchYmm: number | null;
  dotsMm: DotMm[]; dotCount: number;
  validation: { status: 'pass' | 'fail' | 'incomplete'; issues: string[] };
  /** Non-rectangular glass only: the clipped grid plus edge-coverage dots. */
  shape?: { kind: OutlineShapeKind; outlineMm: PointMm[]; edgeDotCount: number };
};
export type LayoutRequest = {
  windowId: string; dimensionRevision: number; widthMm: number; heightMm: number;
  guidelineId: string; guidelineVersion: string;
  /** Non-rectangular glass only. Absent means the original rectangular rules apply. */
  shapeKind?: OutlineShapeKind; outlineMm?: PointMm[];
};
export type ProjectedDot = { dotId: string; centerNorm: PointNorm; outlineNorm: PointNorm[] };
export type PreviewResult = {
  windowId: string; layoutVersion: string; photoRevision: number; projectedDots: ProjectedDot[];
  outlineNorm?: PointNorm[];
};
export type LayoutCheck = {
  status: 'pass' | 'fail' | 'incomplete'; geometryPassed: boolean;
  issues: string[]; pending: string[];
};
export type WindowDraft = {
  windowId: string; buildingId: string; label: string; image: ImageAsset | null;
  corners: Partial<CornersNorm>; dimensions: DimensionEntry;
  dimensionRevision: number; photoRevision: number; layout: LayoutResult | null;
  shape?: ShapeEntry;
  screening?: ScreeningRecord;
  material?: MaterialSelection;
};
export type WindowHandoff = {
  schemaVersion: '0.1'; exportedAt: string; input: WindowInput;
  originalDimensions: DimensionEntry; imageAsset: ImageAsset;
  guideline: GuidelineProfile; layout: LayoutResult; validation: LayoutCheck; preview: PreviewResult;
  previewNotice: string; material?: MaterialSelection;
};
export type LayoutProvider = (request: LayoutRequest, guideline: GuidelineProfile) => Promise<unknown>;
