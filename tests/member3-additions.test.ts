import { expect, it } from 'vitest';
import { BASELINE_GUIDELINE as profile } from '../src/config/baseline';
import { buildLayoutRequest, buildWindowInput, createWindow, setDimensions } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { findAxisPosition, validateLayout } from '../src/features/member2/validation';
import { generatePattern, gridMetrics, measurementSensitivity, validatePattern } from '../src/features/member3';
import { treatmentFor } from '../src/demo/planning';
import { buildLayoutSheet } from '../src/demo/layoutSheet';

function fixture(widthMm = 1200, heightMm = 1500, label = 'Lobby pane'): WindowDraft {
  const draft: WindowDraft = { ...createWindow(label), dimensions: { width: String(widthMm), height: String(heightMm), unit: 'mm' }, image: { imageId: 'fixture', name: 'photo.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true, kind: 'illustration' }, corners: { tl: { u: .1, v: .1 }, tr: { u: .9, v: .1 }, br: { u: .9, v: .9 }, bl: { u: .1, v: .9 } } };
  draft.layout = generatePattern(buildLayoutRequest(draft, profile), profile); return draft;
}

it('identifies the exact next-column threshold without allocating dots', () => {
  const below = gridMetrics(1259.9, 1500), at = gridMetrics(1260, 1500);
  expect(below.columns).toBe(25); expect(below.clearLeftMm).toBeCloseTo(24.95);
  expect(below.nextColumnAtWidthMm).toBe(1260); expect(at.columns).toBe(26); expect(at.clearLeftMm).toBe(0);
});
it('shows count changes near a threshold and offset changes away from it', () => {
  const changing = measurementSensitivity(1260, 1500, 1);
  expect(changing.countChanges).toBe(true); expect(changing.low?.dotCount).toBe(750); expect(changing.high?.dotCount).toBe(780);
  const stable = measurementSensitivity(1200, 1500, 1);
  expect(stable.countChanges).toBe(false); expect(stable.low?.dotCount).toBe(720); expect(stable.high?.dotCount).toBe(720);
  expect(stable.low?.startXmm).toBe(24.5); expect(stable.high?.startXmm).toBe(25.5);
});
it('handles out-of-range sensitivity scenarios and preview-capacity changes', () => {
  expect(measurementSensitivity(10, 10, 1).low).toBeNull();
  expect(measurementSensitivity(5000, 5000, 10).exceedsPreviewLimit).toBe(true);
  expect(() => measurementSensitivity(1200, 1500, NaN)).toThrow('variation');
  expect(() => measurementSensitivity(1200, 1500, -1)).toThrow('variation');
});
it.each([[10, 1200, 1], [1200, 10, 1], [100000, 1200, 1], [1200, 100000, 1], [1200, 1500, 100000]])(
  'does not claim a count change for an unsupported %s × %s ±%s mm range', (width, height, variation) => {
    const result = measurementSensitivity(width, height, variation);
    expect(result.countChanges).toBeNull();
    expect(result.low === null || result.high === null).toBe(true);
    expect(result.nominal.dotCount).toBeGreaterThan(0);
  },
);
it('accepts inclusive dimension limits and zero variation without an unknown result', () => {
  for (const [width, height, variation] of [[10, 10, 0], [100000, 100000, 0], [11, 11, 1], [99999, 99999, 1]]) {
    const result = measurementSensitivity(width, height, variation);
    expect(result.low).not.toBeNull();
    expect(result.high).not.toBeNull();
    expect(result.countChanges).toBe(false);
  }
});
it('preserves tolerance matching while using binary coordinate lookup', () => {
  const positions = [5, 55, 105, 155], tolerance = 1e-7;
  for (const value of [5, 5 - tolerance / 2, 5 + tolerance / 2, 55, 105 + tolerance / 2, 100, 200]) {
    expect(findAxisPosition(positions, value, tolerance)).toBe(positions.findIndex(position => Math.abs(position - value) <= tolerance));
  }
});
it('supports a real 10000-dot layout through both independent validators', () => {
  const draft = fixture(5000, 5000), request = buildLayoutRequest(draft, profile);
  expect(draft.layout!.dotCount).toBe(10000);
  expect(validatePattern(draft.layout, request, profile).geometryPassed).toBe(true);
  expect(validateLayout(draft.layout, buildWindowInput(draft), profile).geometryPassed).toBe(true);
});
it('exports dimensioned offsets to dot centres, separate from edge clearances', () => {
  const sheet = buildLayoutSheet(treatmentFor(fixture()));
  expect(sheet).toContain('>25 mm</strong>'); expect(sheet).toContain('>20 mm</strong>');
  expect(sheet).toContain('720 dots'); expect(sheet).toContain('30 rows × 24 columns');
  expect(sheet).toContain('NOT TO SCALE'); expect(sheet).toContain('Do not measure distances on this drawing');
  expect(sheet).toContain('Print / Save as PDF'); expect(sheet).toContain('BG-EDGE-001');
});
it('keeps a large sheet compact and revalidates changed records at export', () => {
  const treatment = treatmentFor(fixture(5000, 5000));
  const sheet = buildLayoutSheet(treatment);
  expect(sheet).toContain('<pattern'); expect(sheet.length).toBeLessThan(15000);
  expect(sheet).toContain('10,000 dots');
  const changed = setDimensions(treatment.draft, { width: '1000', height: '1000', unit: 'mm' });
  expect(() => buildLayoutSheet({ ...treatment, draft: changed })).toThrow('Generate');
});
it('escapes window labels and supports a single-dot placement reference', () => {
  const sheet = buildLayoutSheet(treatmentFor(fixture(10, 10, '<img onerror=alert(1)>')));
  expect(sheet).not.toContain('<img onerror'); expect(sheet).toContain('&lt;img');
  expect(sheet).toContain('>5 mm</strong>'); expect(sheet).toContain('>0 mm</strong>');
  expect(sheet).toContain('no horizontal repeat'); expect(sheet).toContain('no vertical repeat');
});

it.each([[1200, 1500], [1234.5, 1578.5], [10, 160], [160, 10], [10, 10]])(
  'keeps the placement sheet unchanged when valid %s × %s dot coordinates are reordered', (width, height) => {
    const draft = fixture(width, height), layout = draft.layout!;
    const originalDots = structuredClone(layout.dotsMm);
    const originalSheet = buildLayoutSheet(treatmentFor(draft));
    const orders = [
      [...layout.dotsMm].reverse(),
      [...layout.dotsMm.filter((_, i) => i % 2 === 1), ...layout.dotsMm.filter((_, i) => i % 2 === 0)],
    ];
    for (const dotsMm of orders) {
      const reordered = { ...draft, layout: { ...layout, dotsMm } };
      const savedOrder = structuredClone(dotsMm);
      expect(validatePattern(reordered.layout, buildLayoutRequest(reordered, profile), profile).geometryPassed).toBe(true);
      expect(validateLayout(reordered.layout, buildWindowInput(reordered), profile).geometryPassed).toBe(true);
      expect(buildLayoutSheet(treatmentFor(reordered))).toBe(originalSheet);
      expect(reordered.layout.dotsMm).toEqual(savedOrder);
    }
    expect(layout.dotsMm).toEqual(originalDots);
  },
);
