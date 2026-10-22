// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { BuildingPlan } from '../src/demo/BuildingPlan';
import { emptyPlan, planEntry, treatmentFor } from '../src/demo/planning';
import { BASELINE_GUIDELINE as guideline } from '../src/config/baseline';
import { buildLayoutRequest, createWindow } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { MaterialPlanner } from '../src/features/materials/MaterialPlanner';
import { buildTreatmentReport } from '../src/demo/treatmentReport';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

function fixture(label: string, widthCm = '100', heightCm = '100', materialId?: string): WindowDraft {
  const draft: WindowDraft = {
    ...createWindow(label),
    dimensions: { width: widthCm, height: heightCm, unit: 'cm' },
    image: { imageId: 'fix', name: 'p.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 1000, orientationNormalized: true, kind: 'illustration' },
    corners: { tl: { u: 0.1, v: 0.1 }, tr: { u: 0.9, v: 0.1 }, br: { u: 0.9, v: 0.9 }, bl: { u: 0.1, v: 0.9 } },
    ...(materialId ? { material: { materialId, overrides: {} } } : {})
  };
  draft.layout = generatePattern(buildLayoutRequest(draft, guideline), guideline);
  return draft;
}

describe('Building Treatment Planner UI', () => {
  it('displays clean empty state when no windows added with working Assess a Window button', async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<BuildingPlan windows={[]} plan={emptyPlan()} onChange={() => {}} onEdit={onEdit} onExport={() => {}} />);

    expect(screen.getByText('Building Treatment Planner')).toBeTruthy();
    expect(screen.getByText('Review your assessed windows, compare treatment costs, and choose which glass surfaces to treat.')).toBeTruthy();
    expect(screen.getByText('No windows added yet.')).toBeTruthy();
    expect(screen.getByText('Start by assessing your first glass surface.')).toBeTruthy();

    const assessBtn = screen.getByRole('button', { name: 'Assess a Window' });
    expect(assessBtn).toBeTruthy();
    await user.click(assessBtn);
  });

  it('shows 6 summary cards and updates totals on window selection and deselection', async () => {
    const w1 = fixture('Lobby East', '100', '100', 'standard-dot-film'); // 1.0 m² = 10.7639 sq ft
    const w2 = fixture('Lobby West', '200', '100', 'standard-dot-film'); // 2.0 m² = 21.5278 sq ft
    const user = userEvent.setup();

    function PlannerHarness() {
      const [plan, setPlan] = useState({
        ...emptyPlan(),
        entries: [planEntry(w1), planEntry(w2)]
      });
      return <BuildingPlan windows={[w1, w2]} plan={plan} onChange={setPlan} onEdit={() => {}} onExport={() => {}} />;
    }

    render(<PlannerHarness />);

    // 6 summary cards initially present
    const summaryRegion = screen.getByRole('generic', { name: 'Building treatment summary' });
    expect(within(summaryRegion).getByText('Windows assessed')).toBeTruthy();
    expect(within(summaryRegion).getByText('Windows selected for treatment')).toBeTruthy();
    expect(within(summaryRegion).getByText('Total selected glass area')).toBeTruthy();
    expect(within(summaryRegion).getByText('Indicative material cost')).toBeTruthy();
    expect(within(summaryRegion).getByText('Estimated installation labour')).toBeTruthy();
    expect(within(summaryRegion).getByText('Indicative treatment subtotal')).toBeTruthy();

    // Check initially both selected
    expect(within(summaryRegion).getByText('All windows selected')).toBeTruthy();

    // Deselect w2
    const checkW2 = screen.getByLabelText('Treat Lobby West');
    expect((checkW2 as HTMLInputElement).checked).toBe(true);
    await user.click(checkW2);

    expect((checkW2 as HTMLInputElement).checked).toBe(false);
    expect(within(summaryRegion).getByText('1 of 2 selected')).toBeTruthy();

    // Deselect w1 so none selected
    const checkW1 = screen.getByLabelText('Treat Lobby East');
    await user.click(checkW1);

    expect(screen.getByText('Select the windows you want to include in your plan.')).toBeTruthy();
    // Verify no confusing budget error messages in the normal UI
    expect(screen.queryByText(/Over budget/)).toBeNull();
    expect(screen.queryByText(/Enter a budget to compare/)).toBeNull();
  });

  it('supports sorting by priority, cost, and area without altering ecological recommendations', async () => {
    const smallLow = fixture('Rear Door', '50', '50', 'standard-dot-film');
    smallLow.screening = { inputs: { collisions: 'none', treatment: 'none' } };

    const largeHigh = fixture('Atrium Glass', '300', '200', 'premium-clear-film');
    largeHigh.screening = { inputs: { collisions: 'yes', treatment: 'none' }, collisionEvidence: 'Observed strike' };

    const mediumMid = fixture('Side Pane', '150', '150', 'die-cut-frosted');
    mediumMid.screening = { inputs: { collisions: 'unknown', treatment: 'none' } };

    function SortHarness() {
      const [plan, setPlan] = useState({
        ...emptyPlan(),
        entries: [planEntry(smallLow), planEntry(largeHigh), planEntry(mediumMid)]
      });
      return <BuildingPlan windows={[smallLow, largeHigh, mediumMid]} plan={plan} onChange={setPlan} onEdit={() => {}} onExport={() => {}} />;
    }

    render(<SortHarness />);

    // Check priority text and badges exist
    expect(screen.getByText('High')).toBeTruthy();

    // Sort by priority
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'priority' } });
    let rows = within(screen.getByRole('region', { name: 'Building plan' })).getAllByRole('row');
    expect(within(rows[1]).getByText('Atrium Glass')).toBeTruthy();

    // Sort by cost
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'cost' } });
    rows = within(screen.getByRole('region', { name: 'Building plan' })).getAllByRole('row');
    expect(within(rows[1]).getByText('Atrium Glass')).toBeTruthy();

    // Sort by area
    fireEvent.change(screen.getByLabelText('Sort by'), { target: { value: 'area' } });
    rows = within(screen.getByRole('region', { name: 'Building plan' })).getAllByRole('row');
    expect(within(rows[1]).getByText('Atrium Glass')).toBeTruthy();

    // Note disclaimer
    expect(screen.getByText(/Priorities use preliminary BirdGlass ecological screening rules/)).toBeTruthy();
    expect(screen.getByText(/Sorting is for comparison only/)).toBeTruthy();
  });

  it('flags unpriced specialist access when high-rise access is selected', () => {
    const highRiseWindow = fixture('High Rise Facade', '200', '200', 'standard-dot-film');
    highRiseWindow.material = {
      materialId: 'standard-dot-film',
      installationMethod: 'difficult-access',
      overrides: {}
    };

    render(
      <BuildingPlan
        windows={[highRiseWindow]}
        plan={{ ...emptyPlan(), entries: [planEntry(highRiseWindow)] }}
        onChange={() => {}}
        onEdit={() => {}}
        onExport={() => {}}
      />
    );

    expect(screen.getByText('Specialist access required:')).toBeTruthy();
    expect(screen.getByText(/Access unpriced for 1 window\(s\)/)).toBeTruthy();
  });

  it('exports treatment report with only selected windows and includes treatment choices and exclusions', () => {
    const w1 = fixture('Selected Window', '100', '100', 'standard-dot-film');
    const w2 = fixture('Unselected Window', '100', '100', 'die-cut-frosted');
    const plan = {
      ...emptyPlan(),
      entries: [planEntry(w1), { ...planEntry(w2), selected: false }]
    };

    const t1 = treatmentFor(w1);
    const html = buildTreatmentReport([t1], plan, true);

    expect(html).toContain('Selected Window');
    expect(html).not.toContain('Unselected Window');
    expect(html).toContain('Treatment choice');
    expect(html).toContain('Standard Printed-Dot Film');
    expect(html).toContain('Exclusions:');
    expect(html).toContain('Unentered mobilisation, delivery, custom artwork, tax, equipment, and specialist high-rise access charges');
  });
});

it('keeps saved budget tools out of the public planner and does not let them block downloads', async () => {
  const draft = fixture('Lobby', '100', '100', 'standard-dot-film');
  const saved = {...emptyPlan(), budgetEnabled: true, budget: 'invalid budget', costMode: 'legacy' as const,
    purchasing: {...emptyPlan().purchasing, allowance: 'invalid allowance'}, entries: [planEntry(draft)]};
  const onChange = vi.fn(), onExport = vi.fn();
  render(<BuildingPlan windows={[draft]} plan={saved} onChange={onChange} onEdit={() => {}} onExport={onExport}/>);
  expect(screen.queryByLabelText('Optimize Within Budget')).toBeNull();
  expect(screen.queryByLabelText('Treatment budget (RM)')).toBeNull();
  expect(screen.queryByText(/Advanced budget/)).toBeNull();
  expect(screen.queryByText(/previous project quotation/)).toBeNull();
  expect(screen.queryByText(/priority-first greedy/)).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
  const cards = within(screen.getByLabelText('Building treatment summary'));
  expect(cards.getByText('RM 96.88')).toBeTruthy();
  expect(cards.getByText('RM 37.67')).toBeTruthy();
  expect(cards.getByText('RM 134.55')).toBeTruthy();
  const download = screen.getByRole('button', {name: /Download building summary/});
  expect((download as HTMLButtonElement).disabled).toBe(false);
  await userEvent.setup().click(download);
  expect(onExport.mock.calls[0][0].map((item: {draft: WindowDraft}) => item.draft.windowId)).toEqual([draft.windowId]);
  await userEvent.setup().click(screen.getByLabelText('Treat Lobby'));
  expect(onChange.mock.lastCall?.[0]).toMatchObject({budget: 'invalid budget', budgetEnabled:true, costMode:'legacy', entries:[{selected:false}]});
});

it('navigates from an empty building plan to a window assessment', async () => {
  window.history.replaceState({}, '', '/#home');
  const draft = fixture('Lobby'), onEdit = vi.fn();
  render(<BuildingPlan windows={[draft]} plan={emptyPlan()} onChange={() => {}} onEdit={onEdit} onExport={() => {}}/>);
  await userEvent.setup().click(screen.getByRole('button', {name:'Assess a Window'}));
  expect(onEdit).toHaveBeenCalledWith(draft.windowId);
  expect(window.location.hash).toBe('#photo-workspace');
});

it('recalculates all six summary cards and exports only the selected treatments', async () => {
  const a=fixture('East','100','100','standard-dot-film'), b=fixture('West','200','100','standard-dot-film');
  const onExport=vi.fn();
  function Harness(){ const[plan,setPlan]=useState({...emptyPlan(),entries:[planEntry(a),planEntry(b)]});
    return <BuildingPlan windows={[a,b]} plan={plan} onChange={setPlan} onEdit={()=>{}} onExport={onExport}/>; }
  render(<Harness/>); const user=userEvent.setup();
  const cards=within(screen.getByLabelText('Building treatment summary'));
  expect(cards.getByText('3 m²')).toBeTruthy();
  expect(cards.getByText('RM 290.63')).toBeTruthy();
  expect(cards.getByText('RM 113.02')).toBeTruthy();
  expect(cards.getByText('RM 403.65')).toBeTruthy();
  await user.click(screen.getByLabelText('Treat West'));
  expect(cards.getByText('1 m²')).toBeTruthy();
  expect(cards.getByText('RM 134.55')).toBeTruthy();
  await user.click(screen.getByRole('button',{name:/Download building summary/}));
  expect(onExport.mock.calls[0][0].map((item:{draft:WindowDraft})=>item.draft.label)).toEqual(['East']);
  await user.click(screen.getByLabelText('Treat East'));
  expect(cards.getAllByText('RM 0.00')).toHaveLength(3);
  expect(screen.getByText('Select the windows you want to include in your plan.')).toBeTruthy();
  expect((screen.getByRole('button',{name:/Download building summary/}) as HTMLButtonElement).disabled).toBe(true);
});

it('updates building totals when the material changes without changing ecological priority', async () => {
  const initial=fixture('Lobby','100','100','standard-dot-film');
  initial.screening={inputs:{collisions:'yes'},collisionEvidence:'Observed collision'};
  function Harness(){const[draft,setDraft]=useState(initial);const[plan,setPlan]=useState({...emptyPlan(),entries:[planEntry(initial)]});
    return <><MaterialPlanner window={draft} onChange={setDraft}/><BuildingPlan windows={[draft]} plan={plan} onChange={setPlan} onEdit={()=>{}} onExport={()=>{}}/></>;}
  render(<Harness/>);
  await userEvent.setup().click(screen.getByRole('button',{name:'Select Premium Ultra-Clear Printed-Dot Film'}));
  const planner=within(screen.getByRole('region',{name:'Building plan'}));
  expect(planner.getByText('Premium Ultra-Clear Printed-Dot Film')).toBeTruthy();
  const cards=within(screen.getByLabelText('Building treatment summary'));
  expect(cards.getByText('RM 129.17')).toBeTruthy();
  expect(cards.getByText('RM 166.84')).toBeTruthy();
  expect(planner.getByText('High')).toBeTruthy();
});

it('labels missing prices and unsupported labour instead of presenting them as free', () => {
  const draft=fixture('Specialist','100','100','specialist-markers');
  render(<BuildingPlan windows={[draft]} plan={{...emptyPlan(),entries:[planEntry(draft)]}} onChange={()=>{}} onEdit={()=>{}} onExport={()=>{}}/>);
  const cards=within(screen.getByLabelText('Building treatment summary'));
  expect(cards.getAllByText('Quotation required')).toHaveLength(3);
  expect(cards.getByText('Preliminary subtotal · quotes pending')).toBeTruthy();
  expect(cards.queryByText('Materials + estimated labour')).toBeNull();
  expect(screen.getAllByText(/Known costs only/)).toHaveLength(2);
});

it('keeps incomplete costs after priced windows when sorting by estimated cost', () => {
  const unknown=fixture('Unknown','200','100','specialist-markers'), priced=fixture('Priced','50','50','standard-dot-film');
  render(<BuildingPlan windows={[unknown,priced]} plan={{...emptyPlan(),entries:[planEntry(unknown),planEntry(priced)]}} onChange={()=>{}} onEdit={()=>{}} onExport={()=>{}}/>);
  fireEvent.change(screen.getByLabelText('Sort by'),{target:{value:'cost'}});
  const rows=screen.getAllByRole('row');
  expect(within(rows[1]).getByText('Priced')).toBeTruthy();
  expect(within(rows[2]).getByText('Unknown')).toBeTruthy();
});

it('filters deselected windows at the report boundary and ignores hidden budget errors', () => {
  const included=fixture('Included','100','100','standard-dot-film'), excluded=fixture('Excluded','200','100','standard-dot-film');
  const treatments=[treatmentFor(included),treatmentFor(excluded)];
  const plan={...emptyPlan(),budgetEnabled:true,budget:'invalid',costMode:'legacy' as const,entries:[planEntry(included),{...planEntry(excluded),selected:false}]};
  excluded.layout=null; // A deselected invalid layout must not block the selected report.
  const html=buildTreatmentReport(treatments,plan,true);
  expect(html).toContain('Included'); expect(html).not.toContain('Excluded');
  expect(html).toContain('RM 134.55');expect(html).toContain('Screening priority');
  expect(html).toContain('Standard Printed-Dot Film');expect(html).toContain('Exclusions:');
  expect(html).not.toContain('Budget remaining');expect(html).not.toContain('No budget entered');
  expect(()=>buildTreatmentReport([treatments[0]],{...plan,entries:[{...planEntry(included),selected:false}]},true)).toThrow('Select a current treatment');
});

it('opens the selected window material chooser without using the photo-edit action',async()=>{
  const draft=fixture('Lobby','100','100','standard-dot-film'),onEdit=vi.fn(),onChoose=vi.fn();
  render(<BuildingPlan windows={[draft]} plan={{...emptyPlan(),entries:[planEntry(draft)]}} onChange={()=>{}} onEdit={onEdit} onChooseTreatment={onChoose} onExport={()=>{}}/>);
  await userEvent.setup().click(screen.getByRole('button',{name:'Choose treatment'}));
  expect(onChoose).toHaveBeenCalledWith(draft.windowId);expect(onEdit).not.toHaveBeenCalled();
});
