// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { loadProject, saveProject } from '../src/demo/storage';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { buildLayoutRequest, createWindow } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { emptyPlan, planEntry } from '../src/demo/planning';

beforeEach(() => { window.history.replaceState({},'', '/#assess'); });

it('saves priorities and reasons and sorts without changing selection', async () => {
  const first = fixture('Lobby'), second = fixture('Meeting room'), user = userEvent.setup();
  vi.mocked(loadProject).mockResolvedValue({ version: 1, windows: [first, second], activeId: first.windowId, buildingPlan: { ...emptyPlan(), entries: [planEntry(first), { ...planEntry(second), selected: false }] } });
  render(<App/>); await screen.findByDisplayValue('Lobby');
  await user.click(screen.getByRole('button',{name:'Review screening for Meeting room'}));
  await user.click(screen.getByText('Override the recommendation'));
  await user.selectOptions(screen.getByLabelText('Override priority'),'high');
  await user.type(screen.getByLabelText('Override reason (required)'),'Reported strikes');
  await user.click(screen.getByRole('button',{name:'Apply priority override'}));
  await user.selectOptions(screen.getByLabelText('Sort by'), 'priority');
  const rows = within(screen.getByRole('region', { name: 'Building plan' })).getAllByRole('row');
  expect(within(rows[1]).getByLabelText('Treat Meeting room')).toBeTruthy();
  expect((screen.getByLabelText('Treat Meeting room') as HTMLInputElement).checked).toBe(false);
  await waitFor(() => expect(vi.mocked(saveProject).mock.lastCall?.[0].windows[1].screening?.override).toMatchObject({level:'high',reason:'Reported strikes'}));
  expect(vi.mocked(saveProject).mock.lastCall?.[0].buildingPlan?.entries[1].selected).toBe(false);
});

it('keeps budget and previous quotation panels absent even in debug mode while preserving saved values', async () => {
  window.history.replaceState({}, '', '/?debug=1#assess');
  const first=fixture('Lobby'),second=fixture('Meeting room'),user=userEvent.setup();
  const savedPlan={...emptyPlan(),costMode:'legacy' as const,budgetEnabled:true,budget:'100',entries:[planEntry(first),planEntry(second)],purchasing:{...emptyPlan().purchasing,format:'dots' as const,dotsPerPack:'1000',packPrice:'20',installationPerWindow:'15',projectCharge:'30'}};
  vi.mocked(loadProject).mockResolvedValue({version:1,windows:[first,second],activeId:first.windowId,buildingPlan:savedPlan});
  render(<App/>);await screen.findByDisplayValue('Lobby');
  expect(screen.queryByText('Optimize Within Budget')).toBeNull();
  expect(screen.queryByText('Advanced Cost Settings · previous project quotation')).toBeNull();
  expect(screen.queryByRole('region',{name:'Treatment budget'})).toBeNull();
  await user.click(screen.getByLabelText('Treat Meeting room'));
  await waitFor(()=>expect(vi.mocked(saveProject).mock.lastCall?.[0].buildingPlan?.entries[1].selected).toBe(false));
  const stored=vi.mocked(saveProject).mock.lastCall?.[0].buildingPlan;
  expect(stored).toMatchObject({budget:'100',budgetEnabled:true,costMode:'legacy',purchasing:savedPlan.purchasing});
  await user.click(screen.getByLabelText('Treat Lobby'));
  expect(screen.getByText('Select the windows you want to include in your plan.')).toBeTruthy();
  expect(screen.queryByText(/Over budget/)).toBeNull();
  expect((screen.getByRole('button',{name:/Download building summary/}) as HTMLButtonElement).disabled).toBe(true);
});

vi.mock('../src/demo/storage', () => ({ loadProject: vi.fn(), saveProject: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function fixture(label: string): WindowDraft {
  const draft: WindowDraft = { ...createWindow(label), dimensions: { width: '120', height: '150', unit: 'cm' },
    image: { imageId: 'fixture', name: 'sample.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true, kind: 'illustration' },
    corners: { tl: { u: .1, v: .1 }, tr: { u: .9, v: .1 }, br: { u: .9, v: .9 }, bl: { u: .1, v: .9 } } };
  draft.layout = generatePattern(buildLayoutRequest(draft, BASELINE_GUIDELINE), BASELINE_GUIDELINE); return draft;
}
it('adds windows, persists their plan and blocks exporting stale quantities until explicitly updated', async () => {
  const first = fixture('Lobby'), second = fixture('Meeting room'), user = userEvent.setup();
  vi.mocked(loadProject).mockResolvedValue({ version: 1, windows: [first, second], activeId: first.windowId });
  render(<App/>); await screen.findByDisplayValue('Lobby');
  await user.click(screen.getByRole('button', { name: /Add to building plan/ }));
  await user.click(screen.getByRole('button', { name: /^Meeting room/ }));
  await user.click(screen.getByRole('button', { name: /Add to building plan/ }));
  const plan = within(screen.getByRole('region', { name: 'Building plan' }));
  expect(plan.getAllByRole('row')).toHaveLength(3);
  await waitFor(() => expect(vi.mocked(saveProject).mock.lastCall?.[0].buildingPlan?.entries).toHaveLength(2));
  await user.clear(screen.getByLabelText('Measured width')); await user.type(screen.getByLabelText('Measured width'), '100');
  expect(screen.getByText('Measurements changed. Generate the pattern again.')).toBeTruthy();
  expect((plan.getByRole('button', { name: /Download building summary/ }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('button', { name: 'Generate preview' }));
  expect(plan.getByText('Treatment changed — update plan')).toBeTruthy();
  await user.click(plan.getByRole('button', { name: 'Update plan' }));
  expect((plan.getByRole('button', { name: /Download building summary/ }) as HTMLButtonElement).disabled).toBe(false);
  expect(plan.getByText('1,320')).toBeTruthy();
});
it('uses current per-window pricing rather than a hidden old quotation in debug mode', async () => {
  window.history.replaceState({}, '', '/?debug=1#assess');
  const draft=fixture('Lobby');draft.material={materialId:'standard-dot-film'};
  vi.mocked(loadProject).mockResolvedValue({version:1,windows:[draft],activeId:draft.windowId,buildingPlan:{...emptyPlan(),costMode:'legacy',entries:[planEntry(draft)],purchasing:{format:'film',allowance:'10',unitPrice:'64'}}});
  render(<App/>);await screen.findByDisplayValue('Lobby');
  const planner=within(screen.getByRole('region',{name:'Building plan'}));
  expect(planner.queryByLabelText('Material format')).toBeNull();
  expect(planner.getByLabelText('Building treatment summary').textContent).toContain('RM 242.19');
  expect(planner.queryByText('RM 126.72')).toBeNull();
});

it('places treatment actions after the screening override and immediately before the building planner',async()=>{
 const draft=fixture('Lobby');vi.mocked(loadProject).mockResolvedValue({version:1,windows:[draft],activeId:draft.windowId});
 render(<App/>);await screen.findByDisplayValue('Lobby');
 const actions=screen.getByRole('region',{name:'Treatment actions'}),screening=screen.getByRole('region',{name:'Window priority assessment'}),planner=screen.getByRole('region',{name:'Building plan'});
 expect(actions.previousElementSibling).toBe(screening);expect(actions.nextElementSibling).toBe(planner);
 expect(screening.contains(screen.getByText('Override the recommendation'))).toBe(true);
 expect(actions.id).toBe('export-plan');
 expect(within(screen.getByRole('region',{name:'Treatment Summary'})).queryByRole('button',{name:/Add to building plan/})).toBeNull();
});
