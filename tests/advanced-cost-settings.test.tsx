// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { SQFT_PER_SQM } from '../src/config/materialCatalog';
import { emptyPlan, planEntry, treatmentFor } from '../src/demo/planning';
import { loadProject, saveProject } from '../src/demo/storage';
import { buildTreatmentReport } from '../src/demo/treatmentReport';
import { MaterialPlanner } from '../src/features/materials/MaterialPlanner';
import { estimateMaterial, projectEstimate, tryMaterialEstimate } from '../src/features/materials/estimate';
import { OVERRIDE_KEYS } from '../src/features/materials/types';
import { buildLayoutRequest, createWindow } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';

vi.mock('../src/demo/storage', () => ({ loadProject: vi.fn(), saveProject: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState({}, '', '/'); });

function fixture(): WindowDraft {
  const draft: WindowDraft = { ...createWindow('Cost check'), dimensions: { width: '1200', height: '1500', unit: 'mm' },
    material: { materialId: 'standard-dot-film', installationMethod: 'difficult-access' },
    image: { imageId: 'cost', name: 'test.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true, kind: 'photo' },
    corners: { tl: { u: .1, v: .1 }, tr: { u: .9, v: .1 }, br: { u: .9, v: .9 }, bl: { u: .1, v: .9 } } };
  draft.layout = generatePattern(buildLayoutRequest(draft, BASELINE_GUIDELINE), BASELINE_GUIDELINE);
  return draft;
}
const settings = { unitPrice: '20', installationQuote: '80', minimumLabourCharge: '100', mobilisationCharge: '20',
  accessQuote: '30', minimumOrderCharge: '500', allowancePercent: '10', deliveryCharge: '40', otherCosts: '50' };
const labels = {
  unitPrice: 'Custom unit price (RM / sq ft)', installationQuote: 'Custom labour quote for this window (RM)',
  minimumLabourCharge: 'Minimum labour charge for this window (RM)', mobilisationCharge: 'Mobilisation charge for this window (RM)',
  accessQuote: 'Access quote for this window (RM)', minimumOrderCharge: 'Minimum material charge (RM)', allowancePercent: 'Material allowance (%)',
  deliveryCharge: 'Delivery charge for this window (RM)', otherCosts: 'Other costs for this window (RM)',
};

it('combines all nine settings: allowance, material/labour floors, quote replacement and extras exactly once', () => {
  const draft = fixture(); draft.material!.overrides = { ...settings };
  const result = estimateMaterial(draft);
  expect(result.chargeableQuantity).toBeCloseTo(1.8 * SQFT_PER_SQM * 1.1);
  expect(result.baseCost).toBeCloseTo(426.25085250132);
  expect(result).toMatchObject({ materialCost: 500, installationCost: 100, indicativeSubtotal: 600, knownExtras: 140, installedCost: 740, referenceRate: 9 });
  expect(result.installation.rawLabour).toBe(80);
  expect(result.installation.missingComponents).toEqual([]);
  // Allowance increases purchasing quantities, never physical glass area or dot count.
  expect(result.areaSqm).toBe(1.8); expect(draft.layout!.dotsMm).toHaveLength(720);
});

it.each(OVERRIDE_KEYS)('distinguishes blank from explicit zero for %s', key => {
  const draft = fixture(); draft.material!.overrides = { accessQuote: '0', [key]: '0' };
  const zero = estimateMaterial(draft);
  if (key === 'unitPrice') expect(zero.materialCost).toBe(0);
  if (key === 'installationQuote') expect(zero.installationCost).toBe(0);
  expect(zero.installedCost).not.toBeNull();
  draft.material!.overrides = { [key]: '   ' };
  const blank = estimateMaterial(draft);
  if (key === 'unitPrice') expect(blank.rate).toBe(9);
  if (key === 'installationQuote') expect(blank.installation.rate).toBe(3.5);
  expect(blank.installation.accessCost).toBeNull(); expect(blank.installedCost).toBeNull();
});

it.each(OVERRIDE_KEYS.flatMap(key => ['-1', 'NaN', '1e2', 'Infinity'].map(value => [key, value] as const)))('rejects active invalid %s = %s without publishing a zero estimate', (key, value) => {
  const draft = fixture(); draft.material!.overrides = { [key]: value };
  const result = tryMaterialEstimate(draft);
  expect(result.estimate).toBeNull(); expect(result.error).toContain('non-negative');
});

it('limits allowance to 0–100 and retains full precision until display', () => {
  const draft = fixture(); draft.material!.overrides = { allowancePercent: '100.01' };
  expect(tryMaterialEstimate(draft).error).toContain('0 to 100');
  draft.material!.overrides.allowancePercent = '100';
  expect(estimateMaterial(draft).chargeableQuantity).toBeCloseTo(2 * 1.8 * SQFT_PER_SQM);
});

it('ignores inactive saved access and labour values, but validates them again when reactivated', () => {
  const draft = fixture(); draft.material!.overrides = { accessQuote: '-1', installationQuote: 'bad', minimumLabourCharge: '-5' };
  draft.material!.installationMethod = 'diy';
  expect(estimateMaterial(draft).installationCost).toBe(0);
  draft.material!.installationMethod = 'standard'; draft.material!.useInstallationQuote = false;
  expect(tryMaterialEstimate(draft).error).toContain('minimum labour');
  draft.material!.overrides.minimumLabourCharge = '';
  expect(estimateMaterial(draft).installationCost).toBeCloseTo(1.8 * SQFT_PER_SQM * 3.5);
  draft.material!.installationMethod = 'difficult-access';
  expect(tryMaterialEstimate(draft).error).toContain('access quotation');
  expect(draft.material!.overrides.accessQuote).toBe('-1');
});

it('does not apply saved area pricing settings to a quote-only specialist system', () => {
  const draft = fixture(); draft.material = { materialId: 'external-cords', overrides: { unitPrice: '-1', allowancePercent: 'bad', minimumOrderCharge: '-5' } };
  const result = estimateMaterial(draft);
  expect(result.materialCost).toBeNull(); expect(result.installationCost).toBeNull(); expect(result.installedCost).toBeNull();
});

it('sums all entered charges only for selected windows and preserves them in readable reports', () => {
  const a = fixture(), b = fixture(); a.material!.overrides = { ...settings }; b.material!.overrides = { ...settings, otherCosts: '150' };
  const plan = { ...emptyPlan(), entries: [planEntry(a), planEntry(b)] };
  expect(projectEstimate([a, b], plan).installedTotal).toBe(1580);
  const selectedPlan = { ...plan, entries: [planEntry(a), { ...planEntry(b), selected: false }] };
  expect(projectEstimate([a, b], selectedPlan)).toMatchObject({ materialSubtotal: 500, installationSubtotal: 100, indicativeSubtotal: 600, extras: 140, installedTotal: 740 });
  const html = buildTreatmentReport([treatmentFor(a)], selectedPlan, true);
  for (const text of ['RM 500.00', 'RM 100.00', 'RM 600.00', 'RM 740.00', 'Mobilisation RM 20.00', 'delivery RM 40.00', 'other RM 50.00', 'High-rise / difficult access: RM 30.00', 'Effective rate RM 20.00', 'allowance 10%']) expect(html).toContain(text);
});

it('updates all nine settings through the form, displays totals including extras and resets cleanly', async () => {
  let latest = fixture(); const layout = latest.layout;
  function Harness() { const [draft, setDraft] = useState(latest); return <MaterialPlanner window={draft} onChange={next => { latest = next; setDraft(next); }} />; }
  render(<Harness />); const user = userEvent.setup(); await user.click(screen.getByText('Advanced Cost Settings'));
  for (const key of OVERRIDE_KEYS) fireEvent.change(screen.getByLabelText(labels[key]), { target: { value: settings[key] } });
  const cost = within(screen.getByRole('region', { name: 'Estimated Treatment Cost' }));
  expect(cost.getByText('RM 600.00')).toBeTruthy(); expect(cost.getByText('Scope including entered charges: RM 740.00')).toBeTruthy();
  expect(latest.material!.overrides).toEqual(settings); expect(latest.layout).toBe(layout);
  await user.click(screen.getByRole('button', { name: 'Reset to catalogue settings' }));
  for (const key of OVERRIDE_KEYS) expect((screen.getByLabelText(labels[key]) as HTMLInputElement).value).toBe('');
  expect(cost.getByText('RM 242.19')).toBeTruthy(); expect(latest.layout).toBe(layout);
});

it('shows errors beside their inputs and recovers on correction, clearing or switching installation method', async () => {
  const original = fixture();
  function Harness() { const [draft, setDraft] = useState(original); return <MaterialPlanner window={draft} onChange={setDraft} />; }
  render(<Harness />); const user = userEvent.setup(); await user.click(screen.getByText('Advanced Cost Settings'));
  const access = screen.getByLabelText(labels.accessQuote);
  fireEvent.change(access, { target: { value: '-10' } });
  expect(access.getAttribute('aria-invalid')).toBe('true'); expect(access.getAttribute('aria-describedby')).toBeTruthy();
  expect(screen.getAllByRole('alert').length).toBeGreaterThan(0);
  await user.selectOptions(screen.getByLabelText('Installation method'), 'standard');
  expect((access as HTMLInputElement).disabled).toBe(true); expect(access.getAttribute('aria-invalid')).toBe('false');
  expect(screen.getByText('RM 242.19')).toBeTruthy();
  await user.selectOptions(screen.getByLabelText('Installation method'), 'difficult-access');
  expect(access.getAttribute('aria-invalid')).toBe('true');
  fireEvent.change(access, { target: { value: '' } }); expect(access.getAttribute('aria-invalid')).toBe('false');
  const allowance = screen.getByLabelText(labels.allowancePercent);
  fireEvent.change(allowance, { target: { value: '101' } }); expect(allowance.getAttribute('aria-invalid')).toBe('true');
  fireEvent.change(allowance, { target: { value: '10' } }); expect(allowance.getAttribute('aria-invalid')).toBe('false');
});

it('makes DIY quote/minimum controls inactive and lets a saved custom quote be enabled explicitly', async () => {
  const original = fixture(); original.material!.overrides = { installationQuote: '80', minimumLabourCharge: '100' };
  function Harness() { const [draft, setDraft] = useState(original); return <MaterialPlanner window={draft} onChange={setDraft} />; }
  render(<Harness />); const user = userEvent.setup(); await user.click(screen.getByText('Advanced Cost Settings'));
  await user.selectOptions(screen.getByLabelText('Installation method'), 'diy');
  expect((screen.getByLabelText(labels.installationQuote) as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByLabelText(labels.minimumLabourCharge) as HTMLInputElement).disabled).toBe(true);
  const toggle = screen.getByLabelText('Use custom labour quotation instead of the area-rate estimate') as HTMLInputElement;
  expect(toggle.checked).toBe(false); expect(toggle.disabled).toBe(true);
  await user.selectOptions(screen.getByLabelText('Installation method'), 'standard');
  expect(toggle.checked).toBe(false); expect(toggle.disabled).toBe(false);
  fireEvent.change(screen.getByLabelText(labels.minimumLabourCharge), { target: { value: '' } });
  expect(screen.getByText('RM 242.19')).toBeTruthy(); await user.click(toggle);
  expect(screen.getByText('RM 254.38')).toBeTruthy();
});

it('retains advanced settings through window switching, navigation, autosave and reload', async () => {
  const a = fixture(), b = fixture(); b.label = 'Second pane';
  vi.mocked(loadProject).mockResolvedValue({ version: 1, windows: [a, b], activeId: a.windowId });
  window.history.replaceState({}, '', '/#assess'); const view = render(<App />); const user = userEvent.setup();
  await screen.findByDisplayValue('Cost check'); await user.click(screen.getByText('Advanced Cost Settings'));
  for (const key of OVERRIDE_KEYS) fireEvent.change(screen.getByLabelText(labels[key]), { target: { value: settings[key] } });
  await user.click(screen.getByRole('button', { name: /^Second pane/ }));
  expect((screen.getByLabelText(labels.unitPrice) as HTMLInputElement).value).toBe('');
  await user.click(screen.getByRole('button', { name: /^Cost check/ }));
  await user.click(screen.getByRole('link', { name: 'Home' }));
  await user.click(screen.getByRole('link', { name: 'Assess' }));
  await waitFor(() => expect(vi.mocked(saveProject).mock.lastCall?.[0].windows[0].material?.overrides).toEqual(settings));
  const saved = structuredClone(vi.mocked(saveProject).mock.lastCall![0]); view.unmount();
  vi.mocked(loadProject).mockResolvedValue(saved); render(<App />); await screen.findByDisplayValue('Cost check');
  await user.click(screen.getByText('Advanced Cost Settings'));
  for (const key of OVERRIDE_KEYS) expect((screen.getByLabelText(labels[key]) as HTMLInputElement).value).toBe(settings[key]);
  expect(screen.getByText('Scope including entered charges: RM 740.00')).toBeTruthy();
});
