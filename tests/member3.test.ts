import { describe, expect, it } from 'vitest';
import { BASELINE_GUIDELINE as profile } from '../src/config/baseline';
import { BOUNDARY_POLICY } from '../src/config/boundaryPolicy';
import { buildLayoutRequest, buildWindowInput, createWindow, setCorners, setDimensions } from '../src/features/member2/model';
import { createHandoff } from '../src/features/member2/export';
import { parseLayout, validateLayout } from '../src/features/member2/validation';
import type { LayoutRequest, LayoutResult, WindowDraft } from '../src/features/member2/types';
import { ALGORITHM_VERSION, calculateLayout, calculateQuantities, generatePattern, validatePattern } from '../src/features/member3';

const request: LayoutRequest = {
  windowId: 'window-1', dimensionRevision: 3, widthMm: 1200, heightMm: 1500,
  guidelineId: profile.id, guidelineVersion: profile.version,
};
const generate = (widthMm: number, heightMm: number) => generatePattern({ ...request, widthMm, heightMm }, profile);

describe('Member 3 physical grid', () => {
  it('matches independently specified counts, corners and clear margins for 1200 × 1500 mm', () => {
    const layout = generate(1200, 1500);
    expect([layout.columns, layout.rows, layout.dotCount]).toEqual([24, 30, 720]);
    expect(layout.dotsMm[0]).toEqual({ id: 'r1c1', xMm: 25, yMm: 25 });
    expect(layout.dotsMm.at(-1)).toEqual({ id: 'r30c24', xMm: 1175, yMm: 1475 });
    const check = validatePattern(layout, request, profile);
    expect(check.measurements).toEqual({
      maxCenterPitchXmm: 50, maxCenterPitchYmm: 50, maxClearGapXmm: 40, maxClearGapYmm: 40,
      boundaryClearGapsMm: { left: 20, right: 20, top: 20, bottom: 20 },
    });
    expect(check.geometryPassed).toBe(true);
    expect(check.status).toBe('incomplete');
  });

  it('matches the six-dot integration fixture from the team contract', () => {
    const layout = generate(120, 70);
    expect(layout.dotsMm.map(dot => [dot.xMm, dot.yMm])).toEqual([
      [10, 10], [60, 10], [110, 10], [10, 60], [60, 60], [110, 60],
    ]);
    expect([layout.rows, layout.columns, layout.dotCount]).toEqual([2, 3, 6]);
  });

  it.each([
    [10, 10, 1, 1], [10, 160, 1, 4], [160, 10, 4, 1],
    [59.999999999, 60, 1, 2], [60, 60, 2, 2], [60.000000001, 60, 2, 2],
  ])('handles %s × %s mm without inventing pitch on a single-dot axis', (width, height, columns, rows) => {
    const layout = generate(width, height);
    expect([layout.columns, layout.rows]).toEqual([columns, rows]);
    expect(layout.actualCenterPitchXmm).toBe(columns === 1 ? null : 50);
    expect(layout.actualCenterPitchYmm).toBe(rows === 1 ? null : 50);
    expect(validatePattern(layout, { ...request, widthMm: width, heightMm: height }, profile).geometryPassed).toBe(true);
  });

  it('keeps full dots inside diverse fractional panes, equal margins and exact fixed steps', () => {
    for (const [widthMm, heightMm] of [[1234, 1578], [1249.125, 1500.25], [10.01, 200.2], [3059.9, 2809.99]]) {
      const layout = generate(widthMm, heightMm);
      expect(layout.dotCount).toBe(layout.rows * layout.columns);
      expect(new Set(layout.dotsMm.map(dot => dot.id)).size).toBe(layout.dotCount);
      expect(layout.dotsMm.every(dot => dot.xMm >= 5 && dot.yMm >= 5 && dot.xMm <= widthMm - 5 && dot.yMm <= heightMm - 5)).toBe(true);
      const first = layout.dotsMm[0], last = layout.dotsMm.at(-1)!;
      expect(first.xMm).toBeCloseTo(widthMm - last.xMm, 8);
      expect(first.yMm).toBeCloseTo(heightMm - last.yMm, 8);
      if (layout.columns > 1) expect(layout.dotsMm[1].xMm - first.xMm).toBe(50);
      if (layout.rows > 1) expect(layout.dotsMm[layout.columns].yMm - first.yMm).toBe(50);
    }
  });

  it.each([0, -1, 9.99, NaN, Infinity, 100001])('rejects unsupported dimension %s', widthMm => {
    expect(() => generate(widthMm, 100)).toThrow('dimension');
    expect(() => generate(100, widthMm)).toThrow('dimension');
  });

  it('allows exactly 10000 dots and refuses an oversized allocation', () => {
    expect(generate(4960, 4960).dotCount).toBe(10000);
    expect(() => generate(5010, 4960)).toThrow('10,000');
    expect(() => generate(100000, 100000)).toThrow('10,000');
  });

  it('preserves identities without mutating inputs and versions each new layout', () => {
    const frozen = Object.freeze({ ...request });
    const a = generatePattern(frozen, profile), b = generatePattern(frozen, profile);
    expect([a.windowId, a.dimensionRevision, a.guidelineId, a.guidelineVersion]).toEqual([
      request.windowId, request.dimensionRevision, request.guidelineId, request.guidelineVersion,
    ]);
    expect(a.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(a.layoutVersion).not.toBe(b.layoutVersion);
    expect(a.dotsMm).toEqual(b.dotsMm);
  });

  it('rejects unsupported profiles, mismatched versions and invalid revisions', () => {
    expect(() => generatePattern(request, { ...profile, dotDiameterMm: 7 })).toThrow('10 mm');
    expect(() => generatePattern(request, { ...profile, targetCenterPitchXmm: 60 })).toThrow('50');
    expect(() => generatePattern(request, { ...profile, maxClearGapXmm: 50 })).toThrow('limits');
    expect(() => generatePattern({ ...request, guidelineVersion: 'stale' }, profile)).toThrow('identifiers');
    expect(() => generatePattern({ ...request, dimensionRevision: -1 }, profile)).toThrow('dimensionRevision');
    expect(() => generatePattern({ ...request, windowId: ' ' }, profile)).toThrow('windowId');
  });
});

describe('independent coordinate checking and quantities', () => {
  const mutations: [string, (layout: LayoutResult) => void][] = [
    ['clipped dot', layout => { layout.dotsMm[0].xMm = 4; }],
    ['stretched column', layout => { layout.dotsMm.filter(dot => dot.id.endsWith('c2')).forEach(dot => { dot.xMm += 2; }); }],
    ['unequal margins', layout => { layout.dotsMm.forEach(dot => { dot.xMm += 1; }); }],
    ['duplicate point', layout => { layout.dotsMm[1].xMm = layout.dotsMm[0].xMm; }],
    ['wrong count', layout => { layout.dotCount++; }],
    ['wrong window', layout => { layout.windowId = 'another-window'; }],
    ['stale dimensions', layout => { layout.dimensionRevision++; }],
    ['wrong profile', layout => { layout.guidelineVersion = 'stale'; }],
    ['wrong pitch metadata', layout => { layout.actualCenterPitchXmm = 49; }],
  ];
  it.each(mutations)('detects %s even with a forged pass label', (_name, mutate) => {
    const layout = generate(1200, 1500);
    mutate(layout);
    layout.validation = { status: 'pass', issues: [] };
    expect(validatePattern(layout, request, profile).status).toBe('fail');
    expect(() => calculateQuantities(request, layout, profile)).toThrow();
  });

  it('rejects a centred grid that omits an entire outer column', () => {
    const layout = generate(1200, 1500);
    layout.dotsMm = layout.dotsMm.filter(dot => !dot.id.endsWith('c24')).map(dot => ({ ...dot, xMm: dot.xMm + 25 }));
    layout.columns--; layout.dotCount = layout.dotsMm.length;
    expect(validatePattern(layout, request, profile).issues.join(' ')).toContain('omits');
  });

  it('does not turn a forged pass into research approval', () => {
    const layout = generate(1200, 1500);
    layout.validation = { status: 'pass', issues: [] };
    const check = validatePattern(layout, request, { ...profile, maxBoundaryClearGapMm: undefined });
    expect(check.status).toBe('incomplete');
    expect(check.pending.join(' ')).toContain('boundary');
  });

  it('can enforce a future boundary rule without treating the test value as research', () => {
    // Hypothetical test-only thresholds. These are NOT approved boundary rules.
    const reviewed = { ...profile, status: 'reviewed' as const, maxBoundaryClearGapMm: 20 };
    const layout = generatePattern(request, reviewed);
    expect(validatePattern(layout, request, reviewed).status).toBe('pass');
    expect(validatePattern(layout, request, { ...reviewed, maxBoundaryClearGapMm: 19 }).status).toBe('fail');
    expect(() => generatePattern(request, { ...reviewed, maxBoundaryClearGapMm: Infinity })).toThrow('boundary');
  });

  it('distinguishes purchased window area from the combined circular marker area', () => {
    const layout = generate(1200, 1500), quantities = calculateQuantities(request, layout, profile);
    expect(quantities.windowAreaM2).toBe(1.8);
    expect(quantities.dotCount).toBe(720);
    expect(quantities.totalMarkerAreaM2).toBeCloseTo(0.05654866776461628, 12);
    expect(quantities.markedAreaPercent).toBeCloseTo(Math.PI, 10);
    expect(quantities.layoutVersion).toBe(layout.layoutVersion);
    expect(quantities.validationStatus).toBe('incomplete');
  });
});

describe('BG-EDGE-001 project policy', () => {
  it('versions and records the edge limit without marking external research approval', () => {
    expect(profile.version).toBe('2026-10-15.2');
    expect(profile.maxBoundaryClearGapMm).toBe(25);
    expect(profile.boundaryDefinition).toBe('glass-edge-to-dot-edge');
    expect(profile.status).toBe('draft');
    expect(BOUNDARY_POLICY.note).toContain('not an independently tested');
    const check = validatePattern(generate(1200, 1500), request, profile);
    expect(check.status).toBe('incomplete');
    expect(check.pending.join(' ')).not.toContain('boundary');
  });

  it.each([10, 10.01, 59.999999, 60, 60.01, 1259.9, 1260, 1260.01])('keeps every clear margin below 25 mm for a %s mm side', widthMm => {
    const layout = generate(widthMm, 1500);
    const check = validatePattern(layout, { ...request, widthMm }, profile);
    expect(check.geometryPassed).toBe(true);
    for (const margin of Object.values(check.measurements!.boundaryClearGapsMm)) {
      expect(margin).toBeGreaterThanOrEqual(-1e-7);
      expect(margin).toBeLessThan(25 + 1e-7);
    }
  });

  it.each(['left', 'right', 'top', 'bottom'])('both validators reject an excessive %s clear margin', side => {
    const layout = generate(1200, 1500);
    // Move the complete grid 10 mm: dots still fit, but one clear margin becomes 30 mm.
    layout.dotsMm.forEach(dot => {
      if (side === 'left') dot.xMm += 10;
      if (side === 'right') dot.xMm -= 10;
      if (side === 'top') dot.yMm += 10;
      if (side === 'bottom') dot.yMm -= 10;
    });
    const check = validatePattern(layout, request, profile);
    expect(check.issues.join(' ')).toContain('boundary clear gap');
    const input: ReturnType<typeof buildWindowInput> = {
      schemaVersion: '0.1', buildingId: 'test-building', windowId: request.windowId,
      label: 'Boundary test', imageId: 'test-image', imageWidthPx: 1000, imageHeightPx: 800,
      imageOrientationNormalized: true,
      cornersNorm: { tl: { u: .1, v: .1 }, tr: { u: .9, v: .1 }, br: { u: .9, v: .9 }, bl: { u: .1, v: .9 } },
      widthMm: request.widthMm, heightMm: request.heightMm,
      dimensionRevision: request.dimensionRevision, photoRevision: 0,
    };
    expect(validateLayout(layout, input, profile).issues.join(' ')).toContain('Boundary gap');
  });
});

describe('Member 2 contract integration', () => {
  it('accepts the provider result, exports it and reprojects without changing quantities', async () => {
    let draft: WindowDraft = {
      ...createWindow('Integration fixture'), dimensions: { width: '120', height: '70', unit: 'mm' },
      image: { imageId: 'fixture', name: 'synthetic.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true, kind: 'illustration' },
      corners: { tl: { u: .1, v: .2 }, tr: { u: .9, v: .2 }, br: { u: .9, v: .8 }, bl: { u: .1, v: .8 } },
    };
    const input = buildWindowInput(draft), layoutRequest = buildLayoutRequest(draft, profile);
    draft = { ...draft, layout: parseLayout(await calculateLayout(layoutRequest, profile)) };
    expect(validateLayout(draft.layout, input, profile).geometryPassed).toBe(true);
    const original = createHandoff(draft, profile);
    const moved = createHandoff(setCorners(draft, { ...draft.corners, tl: { u: .15, v: .2 } }), profile);
    expect(original.preview.projectedDots).toHaveLength(6);
    expect(original.layout.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(moved.layout.layoutVersion).toBe(original.layout.layoutVersion);
    expect(moved.preview.projectedDots[0].centerNorm).not.toEqual(original.preview.projectedDots[0].centerNorm);
    expect(calculateQuantities(layoutRequest, moved.layout, profile)).toEqual(calculateQuantities(layoutRequest, original.layout, profile));
    const changed = setDimensions(draft, { width: '121', height: '70', unit: 'mm' });
    expect(validateLayout(draft.layout, buildWindowInput(changed), profile).status).toBe('fail');
  });
});
