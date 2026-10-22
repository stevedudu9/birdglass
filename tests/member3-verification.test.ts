// Member 3 checks for tasks 1-5. Expected values are worked out by hand from the formulas in
// TEST_REPORT.md and compared with the app. Results are saved to docs/Member3-verification-results.json.
import { afterAll, describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { BASELINE_GUIDELINE as profile } from '../src/config/baseline';
import { SQFT_PER_SQM } from '../src/config/materialCatalog';
import { buildLayoutRequest, buildWindowInput, createWindow, readDimensions, setShape } from '../src/features/member2/model';
import { makeHomography, projectDots, projectOutline, transformPoint } from '../src/features/member2/geometry';
import { inverseHomography } from '../src/features/member2/rectification';
import { OutlineIndex } from '../src/features/member2/outline';
import { validateLayout } from '../src/features/member2/validation';
import type { GuidelineProfile, LayoutRequest, LayoutResult, ShapeEntry, WindowDraft } from '../src/features/member2/types';
import { calculateLayout, calculateQuantities, generatePattern, validatePattern } from '../src/features/member3';
import { estimateMaterial } from '../src/features/materials/estimate';
import { treatmentSummary } from '../src/demo/treatmentSummary';
import { buildTreatmentReport } from '../src/demo/treatmentReport';
import { buildLayoutSheet } from '../src/demo/layoutSheet';
import { emptyPlan, treatmentFor } from '../src/demo/planning';

type Row = { task: string; case: string; quantity: string; expected: string | number | null; actual: string | number | null; pass: boolean };
const rows: Row[] = [];
function record(task: string, name: string, quantity: string, expected: number | string | null, actual: number | string | null, digits = 6) {
  const pass = typeof expected === 'number' && typeof actual === 'number' ? Math.abs(expected - actual) <= 10 ** -digits * Math.max(1, Math.abs(expected)) : expected === actual;
  rows.push({ task, case: name, quantity, expected, actual, pass });
  expect(pass, `${name} ${quantity}: expected ${expected}, got ${actual}`).toBe(true);
}
afterAll(() => writeFileSync('docs/Member3-verification-results.json', JSON.stringify({ generatedBy: 'tests/member3-verification.test.ts', rows }, null, 2)));

// Hand-calculation formulas used for the expected values
const manual = {
  columns: (w: number) => Math.floor((w - 10) / 50) + 1,
  rows: (h: number) => Math.floor((h - 10) / 50) + 1,
  firstCentre: (w: number) => (w - (manual.columns(w) - 1) * 50) / 2,
  edgeGap: (w: number) => manual.firstCentre(w) - 5,
  dotAreaM2: Math.PI * 5 * 5 / 1e6,
};
const base = { windowId: 'verify', dimensionRevision: 1, guidelineId: profile.id, guidelineVersion: profile.version };
const req = (widthMm: number, heightMm: number): LayoutRequest => ({ ...base, widthMm, heightMm });
const image = { imageId: 'fixture', name: 'test.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true as const, kind: 'photo' as const };
function draftFor(width: string, height: string, unit: 'mm' | 'cm' | 'm', extra: Partial<WindowDraft> = {}): WindowDraft {
  let draft: WindowDraft = { ...createWindow('Verify'), image, dimensions: { width, height, unit },
    corners: { tl: { u: .12, v: .08 }, tr: { u: .86, v: .14 }, br: { u: .82, v: .9 }, bl: { u: .16, v: .94 } }, ...extra };
  if (extra.shape) draft = setShape(draft, extra.shape);
  draft.layout = generatePattern(buildLayoutRequest(draft, profile), profile);
  return draft;
}

describe('Task 1 — pattern generation', () => {
  const sizes: [number, number][] = [[1200, 1500], [600, 600], [2400, 900], [900, 2400], [305, 1830], [3000, 450], [1234.5, 987.6], [60, 60], [59.9, 160], [10, 10]];
  it.each(sizes)('%s × %s mm: counts, first dot, spacing, diameter and edge gaps match hand calculation', (w, h) => {
    const name = `${w} × ${h} mm (aspect ${(w / h).toFixed(2)})`;
    const layout = generatePattern(req(w, h), profile);
    record('1', name, 'columns', manual.columns(w), layout.columns);
    record('1', name, 'rows', manual.rows(h), layout.rows);
    record('1', name, 'dot count', manual.columns(w) * manual.rows(h), layout.dotCount);
    const xs = [...new Set(layout.dotsMm.map(d => d.xMm))].sort((a, b) => a - b);
    const ys = [...new Set(layout.dotsMm.map(d => d.yMm))].sort((a, b) => a - b);
    record('1', name, 'first centre x (mm)', manual.firstCentre(w), xs[0]);
    record('1', name, 'first centre y (mm)', manual.firstCentre(h), ys[0]);
    // Every dot sits exactly on the expected lattice position.
    expect(layout.dotsMm.every(d => {
      const c = (d.xMm - manual.firstCentre(w)) / 50, r = (d.yMm - manual.firstCentre(h)) / 50;
      return Math.abs(c - Math.round(c)) < 1e-9 && Math.abs(r - Math.round(r)) < 1e-9;
    })).toBe(true);
    const steps = (v: number[]) => v.slice(1).map((x, i) => x - v[i]);
    if (xs.length > 1) record('1', name, 'horizontal pitch (mm)', 50, Math.max(...steps(xs)));
    if (ys.length > 1) record('1', name, 'vertical pitch (mm)', 50, Math.max(...steps(ys)));
    record('1', name, 'marker diameter (mm)', 10, layout.dotDiameterMm);
    const check = validatePattern(layout, req(w, h), profile);
    const gaps = check.measurements!.boundaryClearGapsMm;
    record('1', name, 'left = right edge gap (mm)', manual.edgeGap(w), gaps.left);
    record('1', name, 'top = bottom edge gap (mm)', manual.edgeGap(h), gaps.bottom);
    expect(Math.max(gaps.left, gaps.top)).toBeLessThan(25 + 1e-9);
    expect(check.geometryPassed).toBe(true);
  });

  it('regenerates when dimensions change, and the old layout is rejected for the new size', () => {
    const before = generatePattern(req(1200, 1500), profile);
    const after = generatePattern({ ...req(1260, 1500), dimensionRevision: 2 }, profile);
    record('1', '1200 → 1260 mm width change', 'columns after change', manual.columns(1260), after.columns);
    expect(validatePattern(before, { ...req(1260, 1500), dimensionRevision: 2 }, profile).geometryPassed).toBe(false);
  });

  it.each([
    ['arched top', 1000, 1200, { kind: 'arch', rise: '500' }],
    ['sloped top', 1500, 1000, { kind: 'raked', shortSide: 'right', shortHeight: '400' }],
    ['triangle', 1000, 600, { kind: 'raked', shortSide: 'left', shortHeight: '0' }],
  ] as const)('irregular %s: all dots on the glass and edge coverage within BG-EDGE-002', (name, w, h, shape) => {
    const draft = draftFor(String(w), String(h), 'mm', { shape: shape as ShapeEntry });
    const request = buildLayoutRequest(draft, profile);
    const check = validatePattern(draft.layout, request, profile);
    const outline = new OutlineIndex(request.outlineMm!);
    record('1', `${name} ${w} × ${h} mm`, 'dots fully on glass', draft.layout!.dotCount, draft.layout!.dotsMm.filter(d => outline.fits(d, 5)).length);
    record('1', `${name} ${w} × ${h} mm`, 'geometry passed', 'true', String(check.geometryPassed));
    expect(check.measurements!.shaped!.maxGapMm).toBeLessThanOrEqual(Math.hypot(30, 30) - 5 + 1e-9);
  });
});

describe('Task 2 — pattern validation', () => {
  const request = req(1200, 1500);
  const valid = generatePattern(request, profile);
  const mutate = (fn: (l: LayoutResult) => void) => { const copy: LayoutResult = JSON.parse(JSON.stringify(valid)); fn(copy); return validatePattern(copy, request, profile); };

  it('valid pattern passes geometry; guideline review stays a separate status', () => {
    const check = validatePattern(valid, request, profile);
    record('2', 'valid 1200 × 1500', 'geometryPassed', 'true', String(check.geometryPassed));
    record('2', 'valid 1200 × 1500', 'status (draft guideline)', 'incomplete', check.status);
    const reviewed: GuidelineProfile = { ...profile, status: 'reviewed' };
    record('2', 'valid 1200 × 1500', 'status (reviewed guideline)', 'pass', validatePattern(valid, request, reviewed).status);
  });

  it.each([
    ['excessive spacing (55 mm pitch)', (l: LayoutResult) => { l.dotsMm.forEach(d => { d.xMm = 25 + (d.xMm - 25) * 1.1; }); l.actualCenterPitchXmm = 55; }, /centre spacing must remain 50 mm|outside the glass/],
    ['undersized markers (8 mm)', (l: LayoutResult) => { l.dotDiameterMm = 8; }, /Dot diameter must be 10 mm/],
    ['incomplete edge coverage (last column removed)', (l: LayoutResult) => { l.dotsMm = l.dotsMm.filter(d => d.xMm < 1175); l.columns--; l.dotCount = l.dotsMm.length; }, /centred|omits a row or column/],
    ['missing interior dot', (l: LayoutResult) => { l.dotsMm.splice(100, 1); l.dotCount--; }, /complete rectangular grid/],
    ['dot outside the glass', (l: LayoutResult) => { l.dotsMm[0].xMm = 2; }, /outside the glass/],
    ['forged dot count', (l: LayoutResult) => { l.dotCount = 700; }, /dotCount must match|Rows, columns/],
  ])('flags %s', (name, fn, message) => {
    const check = mutate(fn);
    record('2', name, 'geometryPassed', 'false', String(check.geometryPassed));
    expect(check.issues.join(' ')).toMatch(message);
  });

  it('rejects an undersized-marker or wide-spacing guideline before generating', () => {
    expect(() => generatePattern(request, { ...profile, dotDiameterMm: 8 })).toThrow(/10 mm dots/);
    expect(() => generatePattern(request, { ...profile, targetCenterPitchXmm: 60 })).toThrow(/50 × 50 mm/);
  });

  it('never claims certified collision prevention', () => {
    const draft = draftFor('1200', '1500', 'mm', { material: { materialId: 'standard-dot-film' } });
    const report = buildTreatmentReport([treatmentFor(draft)], emptyPlan());
    expect(report).toContain('does not certify collision prevention');
    const sheet = buildLayoutSheet(treatmentFor(draft));
    for (const text of [report, sheet]) {
      // Any mention of certification or guarantees has to be a "not" statement.
      for (const m of text.matchAll(/[^.<>]*(certif|guarantee|prevents? collisions)[^.<>]*/gi)) expect(m[0]).toMatch(/not|no |never|does not|without/i);
    }
    record('2', 'treatment report + placement sheet', 'positive certification claims', 0, 0);
  });
});

describe('Task 3 — material quantities', () => {
  it.each([
    ['1200', '1500', 'mm'], ['120', '150', 'cm'], ['1.2', '1.5', 'm'],
    ['600', '600', 'mm'], ['2.01', '0.9', 'm'], ['91.5', '213.4', 'cm'],
  ] as const)('%s × %s %s: dots, glass area and marker coverage match hand calculation', (w, h, unit) => {
    const factor = { mm: 1, cm: 10, m: 1000 }[unit];
    // Hand calculation uses exact decimal arithmetic on the typed digits.
    const wMm = Math.round(Number(w) * factor * 1e6) / 1e6, hMm = Math.round(Number(h) * factor * 1e6) / 1e6;
    const draft = draftFor(w, h, unit);
    const q = calculateQuantities(buildLayoutRequest(draft, profile), draft.layout, profile);
    const name = `${w} × ${h} ${unit}`;
    record('3', name, 'dot count', manual.columns(wMm) * manual.rows(hMm), q.dotCount);
    record('3', name, 'glass area (m²)', wMm * hMm / 1e6, q.windowAreaM2, 9);
    record('3', name, 'glass area (sq ft)', wMm * hMm / 1e6 * 10.7639104167, q.windowAreaM2 * SQFT_PER_SQM, 9);
    record('3', name, 'total marker area (m²)', q.dotCount * manual.dotAreaM2, q.totalMarkerAreaM2, 9);
    record('3', name, 'marked area (%)', q.dotCount * manual.dotAreaM2 / (wMm * hMm / 1e6) * 100, q.markedAreaPercent, 9);
  });

  it('unit conversion never drops a row or column (every 1 mm from 10 mm to 20 m, entered in cm and m)', () => {
    let mismatches = 0;
    for (let n = 10; n <= 20_000; n++) for (const [text, unit] of [[String(n / 10), 'cm'], [String(n / 1000), 'm']] as const) {
      const { widthMm } = readDimensions({ width: text, height: '100', unit });
      if (manual.columns(widthMm) !== manual.columns(n)) mismatches++;
    }
    record('3', '19,991 sizes × 2 units', 'count mismatches from unit conversion', 0, mismatches);
  });

  it('marker coverage of an interior grid is π·5² / 50² = 3.1416%', () => {
    const q = calculateQuantities(req(4960, 4960), generatePattern(req(4960, 4960), profile), profile);
    record('3', '4960 × 4960 mm (100 × 100 dots)', 'marked area (%)', 100 * 100 * manual.dotAreaM2 / (4.96 * 4.96) * 100, q.markedAreaPercent, 9);
  });

  it('shaped panes use the outline area, not the bounding box', () => {
    const draft = draftFor('1000', '1200', 'mm', { shape: { kind: 'arch', rise: '500' } });
    const q = calculateQuantities(buildLayoutRequest(draft, profile), draft.layout, profile);
    record('3', 'semicircular arch 1000 × 1200 mm', 'glass area (m²) vs exact π formula', (1000 * 700 + Math.PI * 500 ** 2 / 2) / 1e6, q.windowAreaM2, 3);
    record('3', 'semicircular arch 1000 × 1200 mm', 'bounding area (m²)', 1.2, q.boundingAreaM2, 9);
  });
});

describe('Task 4 — treatment costs', () => {
  const areaSqft = 1.8 * 10.7639104167; // 1200 × 1500 mm = 19.37503875 sq ft
  const estimate = (materialId: string, installationMethod?: string, overrides = {}) =>
    estimateMaterial(draftFor('1200', '1500', 'mm', { material: { materialId, ...(installationMethod ? { installationMethod: installationMethod as 'diy' } : {}), overrides } }));

  it.each([['die-cut-frosted', 7], ['standard-dot-film', 9], ['premium-clear-film', 12]])('%s at RM%s / sq ft', (id, rate) => {
    const e = estimate(id as string);
    record('4', `${id} 1200 × 1500 mm`, 'material cost (RM)', areaSqft * (rate as number), e.materialCost, 9);
  });

  it.each([['diy', 0], ['standard', 3.5], ['conservative', 5]])('film installation: %s', (method, rate) => {
    const e = estimate('standard-dot-film', method as string);
    record('4', `RM9 film · ${method}`, 'labour (RM)', areaSqft * (rate as number), e.installationCost, 9);
    record('4', `RM9 film · ${method}`, 'indicative subtotal (RM)', areaSqft * (9 + (rate as number)), e.indicativeSubtotal, 9);
  });

  it('difficult access: labour at RM3.50 but the access cost stays unknown until quoted', () => {
    const e = estimate('standard-dot-film', 'difficult-access');
    record('4', 'RM9 film · difficult access', 'labour (RM)', areaSqft * 3.5, e.installationCost, 9);
    record('4', 'RM9 film · difficult access', 'installed total', null, e.installedCost);
    record('4', 'RM9 film · difficult access', 'missing components', 'High-rise / difficult-access charge', e.installation.missingComponents.join('; '));
    const quoted = estimate('standard-dot-film', 'difficult-access', { accessQuote: '450' });
    record('4', 'RM9 film · difficult access + RM450 access quote', 'installed total (RM)', areaSqft * 12.5 + 450, quoted.installedCost, 9);
  });

  it('specialist and individual-marker options are never priced with the film rate', () => {
    record('4', 'specialist markers', 'material cost', null, estimate('specialist-markers').materialCost);
    record('4', 'RM7 die-cut · standard', 'labour (individual markers)', null, estimate('die-cut-frosted', 'standard').installationCost);
    record('4', 'RM7 die-cut · DIY', 'labour (RM)', 0, estimate('die-cut-frosted', 'diy').installationCost);
  });

  it('switching material or installation method recalculates from the new selection only', () => {
    const draft = draftFor('1200', '1500', 'mm', { material: { materialId: 'standard-dot-film', installationMethod: 'conservative', overrides: { unitPrice: '15' } } });
    record('4', 'RM9 film with RM15 custom rate', 'material cost (RM)', areaSqft * 15, estimateMaterial(draft).materialCost, 9);
    // The planner replaces the selection when the material changes (MaterialPlanner.tsx), clearing overrides.
    const switched = { ...draft, material: { materialId: 'premium-clear-film' } };
    record('4', 'switched to RM12 film', 'material cost (RM)', areaSqft * 12, estimateMaterial(switched).materialCost, 9);
    record('4', 'switched to RM12 film', 'labour (default standard, RM)', areaSqft * 3.5, estimateMaterial(switched).installationCost, 9);
    const methodOnly = { ...draft, material: { ...draft.material!, installationMethod: 'diy' as const } };
    record('4', 'RM15 custom rate, method → DIY', 'labour (RM)', 0, estimateMaterial(methodOnly).installationCost, 9);
    record('4', 'RM15 custom rate, method → DIY', 'material cost unchanged (RM)', areaSqft * 15, estimateMaterial(methodOnly).materialCost, 9);
  });

  it('allowance is applied to the measured area before the rate', () => {
    record('4', 'RM9 film + 10% allowance', 'material cost (RM)', areaSqft * 1.1 * 9, estimate('standard-dot-film', undefined, { allowancePercent: '10' }).materialCost, 9);
  });
});

describe('Task 5 — integration with Member 2 perspective correction', () => {
  it('projected dots are exactly the homography image of the generated coordinates, and invert back', () => {
    const draft = draftFor('1200', '1500', 'mm');
    const input = buildWindowInput(draft);
    const projected = projectDots(draft.layout!.dotsMm, 10, input.widthMm, input.heightMm, input.cornersNorm);
    const h = makeHomography(input.cornersNorm), inv = inverseHomography(h);
    let worst = 0;
    projected.forEach((p, i) => {
      const back = transformPoint(inv, p.centerNorm.u, p.centerNorm.v);
      worst = Math.max(worst, Math.hypot(back.u * input.widthMm - draft.layout!.dotsMm[i].xMm, back.v * input.heightMm - draft.layout!.dotsMm[i].yMm));
    });
    record('5', '1200 × 1500 mm, perspective corners', 'max round-trip error (mm)', 0, Number(worst.toFixed(9)), 6);
    record('5', '1200 × 1500 mm, perspective corners', 'projected dot count', draft.layout!.dotCount, projected.length);
    // Each grid row stays a straight line in the photo (homographies preserve lines).
    const row = projected.slice(0, draft.layout!.columns).map(p => p.centerNorm);
    const a = row[0], b = row[row.length - 1];
    const off = Math.max(...row.map(p => Math.abs((b.u - a.u) * (p.v - a.v) - (b.v - a.v) * (p.u - a.u))));
    expect(off).toBeLessThan(1e-12);
  });

  it('shaped panes: every projected dot centre lies inside the projected glass outline', () => {
    const draft = draftFor('1000', '1200', 'mm', { shape: { kind: 'arch', rise: '500' } });
    const input = buildWindowInput(draft);
    const outline = new OutlineIndex(projectOutline(input.outlineMm!, input.widthMm, input.heightMm, input.cornersNorm).map(p => ({ xMm: p.u * 1e4, yMm: p.v * 1e4 })));
    const projected = projectDots(draft.layout!.dotsMm, 10, input.widthMm, input.heightMm, input.cornersNorm);
    record('5', 'arch 1000 × 1200 mm on photo', 'projected centres inside outline', projected.length, projected.filter(p => outline.contains({ xMm: p.centerNorm.u * 1e4, yMm: p.centerNorm.v * 1e4 })).length);
  });

  it('complete flow: measurements → generate → both validators → summary → quantities → cost', async () => {
    let draft: WindowDraft = { ...createWindow('Flow'), image, dimensions: { width: '120', height: '150', unit: 'cm' }, material: { materialId: 'standard-dot-film' },
      corners: { tl: { u: .1, v: .1 }, tr: { u: .9, v: .12 }, br: { u: .88, v: .9 }, bl: { u: .12, v: .92 } } };
    const request = buildLayoutRequest(draft, profile);
    draft = { ...draft, layout: await calculateLayout(request, profile) as LayoutResult };
    expect(validateLayout(draft.layout, buildWindowInput(draft), profile).geometryPassed).toBe(true);
    const summary = treatmentSummary(draft);
    record('5', 'full flow 120 × 150 cm', 'summary status', 'incomplete', summary.status);
    record('5', 'full flow 120 × 150 cm', 'dot count', 720, summary.treatment!.quantities.dotCount);
    record('5', 'full flow 120 × 150 cm', 'material cost RM9 (RM)', 1.8 * 10.7639104167 * 9, estimateMaterial(draft).materialCost, 9);
  });
});
