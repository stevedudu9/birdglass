import { describe, expect, it } from 'vitest';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { buildLayoutRequest, createWindow, setDimensions } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { emptyPlan, inspectEntry, isBuildingPlan, planEntry, priorityRank, purchasingEstimate, treatmentFor } from '../src/demo/planning';
import { buildTreatmentReport } from '../src/demo/treatmentReport';

function windowFixture(label = 'Lobby glass'): WindowDraft {
  const draft: WindowDraft = { ...createWindow(label), dimensions: { width: '120', height: '150', unit: 'cm' },
    image: { imageId: 'fixture', name: 'sample.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true, kind: 'illustration' },
    corners: { tl: { u: .1, v: .1 }, tr: { u: .9, v: .1 }, br: { u: .9, v: .9 }, bl: { u: .1, v: .9 } } };
  draft.layout = generatePattern(buildLayoutRequest(draft, BASELINE_GUIDELINE), BASELINE_GUIDELINE);
  return draft;
}
describe('User building plan', () => {
  it('validates priorities and keeps old plans compatible', () => {
    const entry = planEntry(windowFixture());
    expect(isBuildingPlan({ ...emptyPlan(), entries: [entry] })).toBe(true);
    expect(priorityRank(entry)).toBe(0);
    expect(priorityRank({ ...entry, priority: 'high' })).toBe(3);
    expect(isBuildingPlan({ ...emptyPlan(), entries: [{ ...entry, priority: 'urgent' }] })).toBe(false);
    expect(isBuildingPlan({ ...emptyPlan(), entries: [{ ...entry, priorityReason: 'x'.repeat(301) }] })).toBe(false);
  });
  it('excludes changed dimensions and removed windows from usable plan quantities', () => {
    const draft = windowFixture(), entry = planEntry(draft);
    expect(inspectEntry(entry, [draft]).treatment?.quantities.dotCount).toBe(720);
    const changed = setDimensions(draft, { width: '100', height: '150', unit: 'cm' });
    expect(inspectEntry(entry, [changed]).treatment).toBeNull();
    expect(inspectEntry(entry, []).issue).toBe('Window removed');
  });
  it('requires explicit plan updating after a new layout version is generated', () => {
    const draft = windowFixture(), entry = planEntry(draft, 'Ground floor');
    const regenerated = { ...draft, layout: generatePattern(buildLayoutRequest(draft, BASELINE_GUIDELINE), BASELINE_GUIDELINE) };
    expect(inspectEntry(entry, [regenerated]).treatment).toBeNull();
    expect(inspectEntry(planEntry(regenerated, entry.location), [regenerated]).treatment?.quantities.windowAreaM2).toBe(1.8);
  });
  it('estimates full-pane film from glass area and a user-supplied quote', () => {
    const estimate = purchasingEstimate({ format: 'film', allowance: '10', unitPrice: '64' }, 1.8, 720);
    expect(estimate.quantity).toBeCloseTo(1.98);
    expect(estimate.cost).toBeCloseTo(126.72);
  });
  it('rounds individual dots up without adding a phantom dot at a whole-number allowance', () => {
    expect(purchasingEstimate({ format: 'dots', allowance: '10', unitPrice: '' }, 1.8, 720).quantity).toBe(792);
    expect(purchasingEstimate({ format: 'dots', allowance: '1', unitPrice: '' }, 1.8, 721).quantity).toBe(729);
  });
  it('does not invent a price and rejects invalid purchasing inputs', () => {
    expect(purchasingEstimate(emptyPlan().purchasing, 1.8, 720).cost).toBeNull();
    for (const allowance of ['', '-1', '101', 'NaN', '0x10', '1e2']) expect(() => purchasingEstimate({ format: 'film', allowance, unitPrice: '' }, 1.8, 720)).toThrow('allowance');
    expect(() => purchasingEstimate({ format: 'film', allowance: '0', unitPrice: '-3' }, 1.8, 720)).toThrow('price');
  });
  it('validates saved planning metadata including duplicate entries', () => {
    const draft = windowFixture(), entry = planEntry(draft);
    expect(isBuildingPlan({ ...emptyPlan(), entries: [entry] })).toBe(true);
    expect(isBuildingPlan({ ...emptyPlan(), entries: [entry, entry] })).toBe(false);
    expect(isBuildingPlan({ ...emptyPlan(), purchasing: null })).toBe(false);
    expect(isBuildingPlan({ ...emptyPlan(), entries: [null] })).toBe(false);
  });
});
describe('Readable treatment summary', () => {
  it('includes escaped team priority reasons in the summary', () => {
    const draft = windowFixture();
    const html = buildTreatmentReport([treatmentFor(draft)], { ...emptyPlan(), entries: [{ ...planEntry(draft), priority: 'high', priorityReason: '<script>test</script>' }] });
    expect(html).toContain('High');
    expect(html).toContain('&lt;script&gt;test&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('preliminary project screening rules');
  });
  it('includes rounded packs and installation in the downloaded summary', () => {
    const draft = windowFixture();
    const plan = { ...emptyPlan(), costMode:'legacy' as const, entries: [planEntry(draft)], purchasing: { ...emptyPlan().purchasing, format: 'dots' as const, dotsPerPack: '500', packPrice: '20', installationPerWindow: '15', projectCharge: '30' } };
    const html = buildTreatmentReport([treatmentFor(draft)], plan, true, undefined, {debugMode:true});
    expect(html).toContain('2 packs');
    expect(html).toContain('RM 40.00');
    expect(html).toContain('RM 45.00');
    expect(html).toContain('RM 85.00');
  });
  it('includes actual preview geometry, quantities, limitations and purchasing basis', () => {
    const draft = windowFixture(), plan = { ...emptyPlan(), costMode:'legacy' as const, name: 'Block A', entries: [planEntry(draft, 'Lobby')], purchasing: { format: 'film' as const, allowance: '10', unitPrice: '64' } };
    const html = buildTreatmentReport([treatmentFor(draft)], plan, true, undefined, {debugMode:true});
    expect(html).toContain('720'); expect(html).toContain('1.8 m²'); expect(html).toContain('RM 126.72');
    expect(html).toContain('<image href="data:image/png;base64,AAAA"'); expect(html).toContain('<path d="M');
    expect(html).toContain('not a scale installation template'); expect(html.includes('BG-EDGE-001')).toBe(false); expect(html.includes('Reference guidance:')).toBe(false);
    expect(html).toContain('Print / Save as PDF'); expect(html).toContain('Lobby');
  });
  it('escapes user text in report markup and blocks non-image preview content', () => {
    const draft = windowFixture('<script>alert("x")</script>');
    const html = buildTreatmentReport([treatmentFor(draft)], { ...emptyPlan(), name: '<img onerror=alert(1)>' });
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img onerror');
    expect(html).toContain('&lt;script&gt;');
    const unsafeImage = { ...draft, image: { ...draft.image!, dataUrl: 'data:image/png;base64,AAAA" onload="alert(1)' } };
    expect(() => buildTreatmentReport([treatmentFor(unsafeImage)], emptyPlan())).toThrow('photo');
  });
});


