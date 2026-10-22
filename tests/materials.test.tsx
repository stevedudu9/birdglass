// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MATERIAL_CATALOG, SQFT_PER_SQM, findMaterial } from '../src/config/materialCatalog';
import { estimateMaterial, projectEstimate, budgetSuggestion } from '../src/features/materials/estimate';
import { isMaterialSelection } from '../src/features/materials/types';
import { MaterialPlanner } from '../src/features/materials/MaterialPlanner';
import { createWindow, buildLayoutRequest, setDimensions } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { emptyPlan, planEntry, treatmentFor, isBuildingPlan } from '../src/demo/planning';
import { buildTreatmentReport } from '../src/demo/treatmentReport';
import { projectCostReport } from '../src/features/materials/report';
import { createHandoff } from '../src/features/member2/export';
import { buildProjectData } from '../src/demo/projectExport';
import { BuildingPlan } from '../src/demo/BuildingPlan';
import App from '../src/App';
import { loadProject, saveProject } from '../src/demo/storage';

vi.mock('../src/demo/storage',()=>({loadProject:vi.fn(),saveProject:vi.fn().mockResolvedValue(undefined)}));
afterEach(()=>{cleanup();vi.clearAllMocks();window.history.replaceState({},'','/');});
function fixture(label='Lobby',materialId='standard-dot-film'):WindowDraft {
  const draft:WindowDraft={...createWindow(label),material:{materialId},dimensions:{width:'1200',height:'1500',unit:'mm'},
    image:{imageId:'fixture',name:'test.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'photo'},
    corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
  draft.layout=generatePattern(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
}
it.each([['standard-dot-film',9,'174.38'],['premium-clear-film',12,'232.50'],['die-cut-frosted',7,'135.63']])('prices %s with precise area conversion and rate %s', (id,rate,total)=>{
  const result=estimateMaterial(fixture('Lobby',id));
  expect(result.areaSqm).toBe(1.8);expect(result.areaSqft).toBeCloseTo(19.37503875006,9);
  expect(result.rate).toBe(rate);expect(result.materialCost).toBeCloseTo(1.8*SQFT_PER_SQM*rate,9);
  expect(result.materialCost!.toFixed(2)).toBe(total);if(id==='die-cut-frosted'){expect(result.installedCost).toBeNull();expect(result.installationCost).toBeNull();}else{expect(result.installationCost).toBeCloseTo(1.8*SQFT_PER_SQM*3.5);expect(result.installedCost).toBeCloseTo(1.8*SQFT_PER_SQM*(rate+3.5));}
});
it('uses the entered units and updates dimensions even while the pattern needs regeneration',()=>{
  const original=fixture(),changed=setDimensions(original,{width:'1',height:'2',unit:'m'});
  expect(changed.layout).toBeNull();expect(estimateMaterial(changed).materialCost).toBeCloseTo(2*SQFT_PER_SQM*9);
  expect(estimateMaterial({...original,dimensions:{width:'120',height:'150',unit:'cm'}}).areaSqm).toBe(1.8);
});
it('leaves missing or unsupported prices unavailable, including after a custom number is supplied',()=>{
  for(const id of ['specialist-markers','external-cords','architectural-glazing','unknown-saved-id']){
    const draft=fixture('Specialist',id);draft.material!.overrides={unitPrice:'10'};
    expect(estimateMaterial(draft).materialCost).toBeNull();expect(estimateMaterial(draft).installedCost).toBeNull();
  }
  expect(estimateMaterial({...fixture(),material:undefined}).materialCost).toBeNull();
});
it('supports per-square-metre references without applying the square-foot multiplier',()=>{
  const material={...findMaterial('standard-dot-film')!,pricingModel:'PER_SQM' as const,unitPrice:100};
  expect(estimateMaterial(fixture(),material).materialCost).toBe(180);
});
it('applies an explicit allowance and a minimum charge floor without changing the reference rate',()=>{
  const draft=fixture();draft.material!.overrides={unitPrice:'10',allowancePercent:'10',minimumOrderCharge:'250',installationQuote:'30',deliveryCharge:'5',otherCosts:'2'};
  const result=estimateMaterial(draft);
  expect(result.chargeableQuantity).toBeCloseTo(1.8*SQFT_PER_SQM*1.1);expect(result.materialCost).toBe(250);expect(result.installedCost).toBe(287);
  expect(result.referenceRate).toBe(9);expect(findMaterial('standard-dot-film')!.unitPrice).toBe(9);
});
it('applies supported supplier minimum area before the rate, with no invented default allowance',()=>{
  const result=estimateMaterial(fixture(),{...findMaterial('standard-dot-film')!,minimumArea:25});
  expect(result.allowance).toBe(0);expect(result.chargeableQuantity).toBe(25);expect(result.materialCost).toBe(225);
});
it.each(['-1','NaN','Infinity','0x10','1e2'])('rejects an invalid custom quotation %s',unitPrice=>{
  const draft=fixture();draft.material!.overrides={unitPrice};expect(()=>estimateMaterial(draft)).toThrow('non-negative');
});
it('keeps unpriced individual-marker labour unknown but accepts an explicit no-charge quote',()=>{
  const draft=fixture('Markers','die-cut-frosted');expect(estimateMaterial(draft).installedCost).toBeNull();
  draft.material!.overrides={installationQuote:'0'};expect(estimateMaterial(draft).installedCost).toBe(estimateMaterial(draft).materialCost);
});
it('retains the actual frosted/plain-versus-white-print distinction and compatibility warning',()=>{
  const result=estimateMaterial(fixture('Frosted','die-cut-frosted'));
  expect(result.compatibilityWarning).toContain('differs');expect(result.material!.limitations.join(' ')).toContain('RM10');
  expect(MATERIAL_CATALOG.every(item=>!item.birdSafeProductVerified)).toBe(true);
});
it('sums mixed materials without rounding early and labels partial installation/material totals',()=>{
  const a=fixture(),b=fixture('Upper','premium-clear-film');const plan={...emptyPlan(),entries:[planEntry(a),planEntry(b)]};
  const result=projectEstimate([a,b],plan);
  expect(result.materialSubtotal!.toFixed(2)).toBe('406.88');expect(result.installedTotal!.toFixed(2)).toBe('542.50');expect(result.unknownInstallationCount).toBe(0);
  b.material={materialId:'specialist-markers'};const partial=projectEstimate([a,b],plan);
  expect(partial.materialSubtotal).toBeNull();expect(partial.knownMaterialSubtotal).toBe(estimateMaterial(a).materialCost);expect(partial.unknownMaterialCount).toBe(1);
  const stale={...a,dimensionRevision:a.dimensionRevision+1};expect(projectEstimate([stale,b],plan).stale).toBe(true);
});
it('keeps budget disabled by default and never suggests an unknown installed cost as free',()=>{
  const a=fixture(),b=fixture('Unknown','specialist-markers');const plan={...emptyPlan(),budget:'200',entries:[planEntry(a),planEntry(b)]};
  expect(plan.budgetEnabled).toBeUndefined();expect(budgetSuggestion([a,b],plan).selected).toEqual([]);
  const materialOnly=budgetSuggestion([a,b],{...plan,budgetEnabled:true,budgetScope:'materials'});
  expect(materialOnly.selected).toEqual([a.windowId]);expect(materialOnly.unknown).toEqual(['Unknown']);
});
it('uses priority before cost for a suggestion, preserves observations, and only selects quoted installed costs',()=>{
  const a=fixture('Medium'),b=fixture('High');a.material!.overrides={installationQuote:'10'};b.material!.overrides={installationQuote:'10'};
  const plan={...emptyPlan(),budgetEnabled:true,budget:'190',entries:[{...planEntry(a),priority:'medium' as const,priorityReason:'Observation'},{...planEntry(b),priority:'high' as const,priorityReason:'Collision observed'}]};
  const before=structuredClone(plan);expect(budgetSuggestion([a,b],plan).selected).toEqual([b.windowId]);expect(plan).toEqual(before);
});
it('exports actual mixed material costs, sources, exclusions, pending pattern status and unknown installation',()=>{
  const a=fixture(),b=fixture('Courtyard','die-cut-frosted');const plan={...emptyPlan(),name:'Block A',entries:[planEntry(a),planEntry(b)]};
  const html=buildTreatmentReport([treatmentFor(a),treatmentFor(b)],plan,true);
  for(const text of ['RM 174.38','RM 135.63','Standard Printed-Dot Film','Die-Cut Frosted Pattern Sticker','installation quotation required','supplier quotation or certification','https://www.banner3.com/ampang-frosted-glass-sticker','https://my.e-banner.com/frosted-sticker/','Pattern validation incomplete'])expect(html).toContain(text);
});
it('retains per-window selections in JSON handoffs and project exports',async()=>{
  const draft=fixture();draft.material!.overrides={installationQuote:'45'};
  expect(createHandoff(draft,BASELINE_GUIDELINE).material).toEqual(draft.material);
  const result=JSON.parse(await (await buildProjectData([draft],emptyPlan(),BASELINE_GUIDELINE)).text());
  expect(result.windows[0].handoff.material).toEqual(draft.material);
  expect(isMaterialSelection(draft.material)).toBe(true);expect(isMaterialSelection({materialId:'x',overrides:{unitPrice:9}})).toBe(false);expect(isMaterialSelection({materialId:'x',overrides:[]})).toBe(false);
  expect(isBuildingPlan({...emptyPlan(),budgetEnabled:'yes'})).toBe(false);
});
it('selects materials without changing generated geometry, updates instantly, and keeps advanced fields collapsed',async()=>{
  const original=fixture();let last=original;
  function Harness(){const[draft,setDraft]=useState(original);return <MaterialPlanner window={draft} onChange={next=>{last=next;setDraft(next);}}/>;}
  const {container}=render(<Harness/>);const user=userEvent.setup();
  expect(container.querySelector('.material-advanced')!.hasAttribute('open')).toBe(false);
  await user.click(screen.getByRole('button',{name:'Select Premium Ultra-Clear Printed-Dot Film'}));
  expect(within(screen.getByRole('region',{name:'Estimated Treatment Cost'})).getByText('RM 232.50')).toBeTruthy();
  expect(last.layout).toBe(original.layout);expect(last.material?.materialId).toBe('premium-clear-film');
  await user.click(screen.getByText('Advanced Cost Settings'));
  fireEvent.change(screen.getByLabelText('Custom unit price (RM / sq ft)'),{target:{value:'10'}});
  const summary=within(screen.getByRole('region',{name:'Estimated Treatment Cost'}));expect(summary.getByText('RM 193.75')).toBeTruthy();
  expect(summary.getByText(/Original catalogue reference retained/)).toBeTruthy();
});
it('does not show removed budget tools or automatically change selections for a saved budget',()=>{
  const a=fixture(),b=fixture('Premium','premium-clear-film');
  const plan={...emptyPlan(),budgetEnabled:true,budget:'200',entries:[planEntry(a),planEntry(b)]};
  render(<BuildingPlan windows={[a,b]} plan={plan} onChange={()=>{}} onEdit={()=>{}} onExport={()=>{}}/>);
  for(const label of ['Optimize Within Budget','Treatment budget (RM)','Budget covers'])expect(screen.queryByLabelText(label)).toBeNull();
  expect(screen.queryByRole('button',{name:'Apply priority-first suggestion'})).toBeNull();
  expect((screen.getByLabelText('Treat Lobby') as HTMLInputElement).checked).toBe(true);
  expect((screen.getByLabelText('Treat Premium') as HTMLInputElement).checked).toBe(true);
  expect(screen.getByLabelText('Building treatment summary').textContent).toContain('RM 542.50');
});
it('persists different material choices per window and updates cost when dimensions change',async()=>{
  window.history.replaceState({},'','/#assess');const a=fixture('Lobby'),b=fixture('Upper','premium-clear-film');
  vi.mocked(loadProject).mockResolvedValue({version:1,windows:[a,b],activeId:a.windowId});
  render(<App/>);const user=userEvent.setup();await screen.findByDisplayValue('Lobby');
  await user.click(within(screen.getByRole('region',{name:'Treatment Summary'})).getByRole('link',{name:'Review material & pricing'}));
  expect(screen.getByRole('region',{name:'Choose Your Glass Treatment'})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Select Die-Cut Frosted Pattern Sticker'}));
  fireEvent.change(screen.getByLabelText('Measured width'),{target:{value:'1000'}});
  expect(within(screen.getByRole('region',{name:'Estimated Treatment Cost'})).getAllByText('RM 113.02').length).toBeGreaterThan(0);
  await user.click(screen.getByRole('button',{name:/^Upper/}));
  expect(screen.getByRole('button',{name:'Selected Premium Ultra-Clear Printed-Dot Film'}).getAttribute('aria-pressed')).toBe('true');
  await waitFor(()=>expect(vi.mocked(saveProject).mock.lastCall?.[0].windows[0].material?.materialId).toBe('die-cut-frosted'));
});

it('prices explicitly exported current windows even before they were saved to the building plan',()=>{
  const draft=fixture();
  const report=projectCostReport([treatmentFor(draft)],emptyPlan());
  expect(report).toContain('Estimated material total: <strong>RM 174.38</strong>');
  expect(report).toContain('Indicative material + labour subtotal: RM 242.19');
});
