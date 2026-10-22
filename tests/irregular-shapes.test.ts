import { describe, expect, it } from 'vitest';
import { BASELINE_GUIDELINE as profile } from '../src/config/baseline';
import { readOutline, normalizeOutline, polygonArea, OutlineIndex } from '../src/features/member2/outline';
import { createWindow, glassAreaMm2, requestIsCurrent, setDimensions, setShape } from '../src/features/member2/model';
import { validateLayout } from '../src/features/member2/validation';
import type { LayoutRequest, LayoutResult, ShapeEntry, WindowInput } from '../src/features/member2/types';
import { calculateQuantities, coverageLimits, generatePattern, validatePattern, SHAPED_REVIEW_MESSAGE } from '../src/features/member3';

const base = { windowId: 'shape-1', dimensionRevision: 1, guidelineId: profile.id, guidelineVersion: profile.version };
function shapedRequest(widthMm: number, heightMm: number, shape: ShapeEntry): LayoutRequest {
  const outlineMm = readOutline(shape, 'mm', widthMm, heightMm);
  return { ...base, widthMm, heightMm, ...(outlineMm ? { shapeKind: shape.kind as 'arch', outlineMm } : {}) };
}
const adapterInput = (request: LayoutRequest): WindowInput => ({
  schemaVersion: '0.1', buildingId: 'b', windowId: request.windowId, label: 'w', imageId: 'i', imageWidthPx: 100, imageHeightPx: 100,
  imageOrientationNormalized: true, cornersNorm: { tl: { u: 0, v: 0 }, tr: { u: 1, v: 0 }, br: { u: 1, v: 1 }, bl: { u: 0, v: 1 } },
  widthMm: request.widthMm, heightMm: request.heightMm, dimensionRevision: request.dimensionRevision, photoRevision: 0,
  ...(request.outlineMm ? { shapeKind: request.shapeKind, outlineMm: request.outlineMm } : {}),
});
const clone = (layout: LayoutResult): LayoutResult => JSON.parse(JSON.stringify(layout));

describe('Irregular glass outlines', () => {
  it('builds a semicircular arch whose polygon area is within 0.1% of the exact area', () => {
    const outline = readOutline({ kind: 'arch', rise: '500' }, 'mm', 1000, 1200)!;
    const exact = 1000 * 700 + Math.PI * 500 ** 2 / 2;
    expect(Math.abs(Math.abs(polygonArea(outline)) - exact) / exact).toBeLessThan(0.001);
    expect(Math.min(...outline.map(p => p.yMm))).toBeCloseTo(0, 6);
  });

  it('converts shape lengths with the dimension unit', () => {
    const draft = setShape(setDimensions(createWindow('w'), { width: '100', height: '120', unit: 'cm' }), { kind: 'raked', shortSide: 'left', shortHeight: '60' });
    // Trapezoid: 1000 mm wide, sides 600 mm and 1200 mm.
    expect(glassAreaMm2(draft)).toBeCloseTo(1000 * (600 + 1200) / 2, 6);
  });

  it.each([
    [[{ xMm: 0, yMm: 0 }, { xMm: 100, yMm: 100 }, { xMm: 100, yMm: 0 }, { xMm: 0, yMm: 100 }], 'crosses itself'],
    [[{ xMm: 0, yMm: 0 }, { xMm: 50, yMm: 0 }, { xMm: 50, yMm: 100 }], 'must touch'],
    [[{ xMm: 0, yMm: 0 }, { xMm: 120, yMm: 0 }, { xMm: 0, yMm: 100 }], 'within the measured'],
  ])('rejects an unusable custom outline (%#)', (points, message) => {
    expect(() => normalizeOutline(points, 100, 100)).toThrow(message);
  });

  it('rejects an arch rise larger than a semicircle', () => {
    expect(() => readOutline({ kind: 'arch', rise: '600' }, 'mm', 1000, 1200)).toThrow('half the glass width');
  });
});

describe('Shaped pattern generation and validation', () => {
  it('reproduces the rectangular grid exactly when a rectangle is entered as a custom outline', () => {
    const request = shapedRequest(1200, 1500, { kind: 'custom', points: '0,0; 1200,0; 1200,1500; 0,1500' });
    const shaped = generatePattern(request, profile), plain = generatePattern({ ...base, widthMm: 1200, heightMm: 1500 }, profile);
    expect(shaped.shape!.edgeDotCount).toBe(0);
    expect(shaped.dotsMm.map(d => [d.xMm, d.yMm])).toEqual(plain.dotsMm.map(d => [d.xMm, d.yMm]));
    expect(validatePattern(shaped, request, profile).geometryPassed).toBe(true);
  });

  it.each([
    ['semicircular arch', 1000, 1200, { kind: 'arch', rise: '500' }],
    ['shallow segmental arch', 1800, 900, { kind: 'arch', rise: '180' }],
    ['raked top', 1500, 1000, { kind: 'raked', shortSide: 'right', shortHeight: '400' }],
    ['right triangle', 1000, 600, { kind: 'raked', shortSide: 'left', shortHeight: '0' }],
    ['L-shaped custom pane', 900, 900, { kind: 'custom', points: '0,0; 900,0; 900,400; 400,400; 400,900; 0,900' }],
    ['hexagon', 1000, 866, { kind: 'custom', points: '250,0; 750,0; 1000,433; 750,866; 250,866; 0,433' }],
  ] as const)('%s: every dot fits, grid is complete, and edge coverage meets BG-EDGE-002', (_, width, height, shape) => {
    const request = shapedRequest(width, height, shape as ShapeEntry);
    const layout = generatePattern(request, profile);
    const check = validatePattern(layout, request, profile);
    expect(check.issues).toEqual([]);
    expect(check.geometryPassed).toBe(true);
    expect(check.status).toBe('incomplete');
    expect(check.pending).toContain(SHAPED_REVIEW_MESSAGE);
    const outline = new OutlineIndex(request.outlineMm!);
    expect(layout.dotsMm.every(d => outline.fits(d, 5))).toBe(true);
    // Check every pair: edge dots must keep at least 5 mm clear of other dots.
    for (const a of layout.dotsMm) for (const b of layout.dotsMm) {
      if (a !== b && (a.id.startsWith('e') || b.id.startsWith('e'))) expect(Math.hypot(a.xMm - b.xMm, a.yMm - b.yMm)).toBeGreaterThanOrEqual(15 - 1e-9);
    }
    const shaped = check.measurements!.shaped!;
    expect(shaped.maxGapMm).toBeLessThanOrEqual(coverageLimits(profile).cornerLimitMm + 1e-6);
    expect(shaped.latticeDots + shaped.edgeDots).toBe(layout.dotCount);
    expect(validateLayout(layout, adapterInput(request), profile).geometryPassed).toBe(true);
    const quantities = calculateQuantities(request, layout, profile);
    expect(quantities.windowAreaM2).toBeCloseTo(Math.abs(polygonArea(request.outlineMm!)) / 1e6, 9);
    expect(quantities.windowAreaM2).toBeLessThan(quantities.boundingAreaM2 + 1e-12);
  });

  it('derives the coverage limits from the 25 mm rectangle rule', () => {
    const limits = coverageLimits(profile);
    expect(limits.edgeLimitMm).toBeCloseTo(Math.hypot(25, 30) - 5, 9); // 34.0512
    expect(limits.cornerLimitMm).toBeCloseTo(Math.hypot(30, 30) - 5, 9); // 37.4264
  });

  it('flags a sliver too narrow for complete dots instead of claiming coverage', () => {
    // A 2000 × 60 mm right triangle has a ~1.7° tip where no 10 mm dot can reach.
    const request = shapedRequest(2000, 60, { kind: 'raked', shortSide: 'left', shortHeight: '0' });
    const check = validatePattern(generatePattern(request, profile), request, profile);
    expect(check.geometryPassed).toBe(false);
    expect(check.issues.join(' ')).toMatch(/too narrow/);
  });

  describe('tampered shaped layouts are rejected', () => {
    const request = shapedRequest(1000, 1200, { kind: 'arch', rise: '500' });
    const layout = generatePattern(request, profile);
    const run = (mutate: (l: LayoutResult) => void, req = request) => { const copy = clone(layout); mutate(copy); return validatePattern(copy, req, profile); };

    it('removed edge dot → coverage gap', () => {
      const check = run(l => { const i = l.dotsMm.findIndex(d => d.id.startsWith('e')); l.dotsMm.splice(i, 1); l.dotCount--; });
      expect(check.geometryPassed).toBe(false);
      expect(check.issues.join(' ')).toMatch(/Edge coverage gap|No dot lies within/);
    });
    it('removed grid dot → omitted grid position', () => {
      const check = run(l => { const i = l.dotsMm.findIndex(d => d.id === 'r12c10'); l.dotsMm.splice(i, 1); l.dotCount--; });
      expect(check.issues).toContain('The clipped grid omits a 50 mm grid position where a complete dot fits.');
    });
    it('dot moved outside the arch → outside outline', () => {
      expect(run(l => { l.dotsMm[0] = { ...l.dotsMm[0], xMm: 3, yMm: 3 }; }).issues).toContain('A complete dot extends outside the glass outline.');
    });
    it('overlapping dot → overlap', () => {
      expect(run(l => { l.dotsMm.push({ id: 'x', xMm: l.dotsMm[200].xMm + 4, yMm: l.dotsMm[200].yMm }); l.dotCount++; }).issues).toContain('Dots overlap or share a position.');
    });
    it('layout for a different outline → mismatch', () => {
      const other = shapedRequest(1000, 1200, { kind: 'arch', rise: '400' });
      expect(run(() => {}, other).issues).toContain('The layout was generated for a different glass outline.');
    });
    it('shaped layout offered for a rectangular pane → rejected', () => {
      expect(run(() => {}, { ...base, widthMm: 1000, heightMm: 1200 }).geometryPassed).toBe(false);
    });
  });

  it('changing the shape invalidates the old pattern request', () => {
    let draft = setDimensions(createWindow('w'), { width: '1000', height: '1200', unit: 'mm' });
    draft = setShape(draft, { kind: 'arch', rise: '500' });
    const request = shapedRequest(1000, 1200, { kind: 'arch', rise: '500' });
    const current = { ...request, windowId: draft.windowId, dimensionRevision: draft.dimensionRevision };
    expect(requestIsCurrent(draft, current, profile)).toBe(true);
    const changed = setShape(draft, { kind: 'arch', rise: '450' });
    expect(changed.layout).toBeNull();
    expect(requestIsCurrent(changed, { ...current, dimensionRevision: changed.dimensionRevision }, profile)).toBe(false);
  });

  it('generates a large 3 × 3 m arch within a practical time', () => {
    const request = shapedRequest(3000, 3000, { kind: 'arch', rise: '1500' });
    const start = performance.now();
    const layout = generatePattern(request, profile);
    expect(validatePattern(layout, request, profile).geometryPassed).toBe(true);
    expect(performance.now() - start).toBeLessThan(10_000);
  });
});
