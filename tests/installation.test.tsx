// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createWindow, buildLayoutRequest } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { INSTALLATION_REFERENCE } from '../src/config/installation';
import { estimateMaterial, projectEstimate, budgetSuggestion } from '../src/features/materials/estimate';
import { MaterialPlanner } from '../src/features/materials/MaterialPlanner';
import { isMaterialSelection } from '../src/features/materials/types';
import { emptyPlan, planEntry, treatmentFor } from '../src/demo/planning';
import { buildTreatmentReport } from '../src/demo/treatmentReport';
import { createHandoff } from '../src/features/member2/export';

afterEach(cleanup);
function fixture(materialId='standard-dot-film'):WindowDraft {
  const draft:WindowDraft={...createWindow('Installation pane'),material:{materialId},dimensions:{width:'1200',height:'1500',unit:'mm'},
    image:{imageId:'fixture',name:'test.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'photo'},
    corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
  draft.layout=generatePattern(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
}
it('defaults compatible sheet film to the explicit RM3.50 planning assumption with no minimum/mobilisation',()=>{
  const result=estimateMaterial(fixture());
  expect(result.installation).toMatchObject({method:'standard',rate:3.5,minimumLabourCharge:null,mobilisationCharge:null,missingComponents:[]});
  expect(result.installationCost!.toFixed(2)).toBe('67.81');expect(result.indicativeSubtotal!.toFixed(2)).toBe('242.19');
  expect(result.installation.reference?.publishedRange).toEqual({min:2.5,max:5,unit:'sq ft'});
  expect(result.installation.assumption).toContain('not an installation quotation');
});
it('DIY uses zero professional labour even if an old quotation/minimum is retained',()=>{
  const draft=fixture();draft.material={...draft.material!,installationMethod:'diy',overrides:{installationQuote:'80',minimumLabourCharge:'100'}};
  const result=estimateMaterial(draft);expect(result.installationCost).toBe(0);expect(result.indicativeSubtotal).toBe(result.materialCost);
  expect(result.installation.assumption).toContain('own time');expect(result.installation.reference).toBeNull();
});
it('conservative installation uses RM5 and the matching assumption text',()=>{
  const draft=fixture();draft.material!.installationMethod='conservative';const result=estimateMaterial(draft);
  expect(result.installationCost!.toFixed(2)).toBe('96.88');expect(result.indicativeSubtotal!.toFixed(2)).toBe('271.25');
  expect(result.installation.assumption).toContain('RM5.00');expect(result.installation.referenceRate).toBe(5);
});
it('uses actual glass area for labour rather than purchased film allowance or minimum area',()=>{
  const draft=fixture();draft.material!.overrides={allowancePercent:'20',minimumOrderCharge:'300'};const result=estimateMaterial(draft);
  expect(result.materialCost).toBe(300);expect(result.installationCost).toBeCloseTo(result.areaSqft*3.5);
});
it('high-rise retains the base film subtotal but leaves required access unpriced and excludes it from budget suggestions',()=>{
  const draft=fixture();draft.material!.installationMethod='difficult-access';const result=estimateMaterial(draft);
  expect(result.installationCost).not.toBeNull();expect(result.indicativeSubtotal!.toFixed(2)).toBe('242.19');
  expect(result.installation.accessCost).toBeNull();expect(result.installedCost).toBeNull();
  const plan={...emptyPlan(),budget:'1000',entries:[planEntry(draft)]};
  expect(projectEstimate([draft],plan).unknownAccessCount).toBe(1);expect(projectEstimate([draft],plan).installedTotal).toBeNull();
  expect(budgetSuggestion([draft],plan).selected).toEqual([]);
  expect(budgetSuggestion([draft],{...plan,budgetScope:'materials'}).selected).toEqual([draft.windowId]);
});
it('includes an explicit access quote once without claiming a standard rate covers it',()=>{
  const draft=fixture();draft.material={...draft.material!,installationMethod:'difficult-access',overrides:{accessQuote:'150',mobilisationCharge:'20'}};
  const result=estimateMaterial(draft);expect(result.installedCost).toBeCloseTo(result.indicativeSubtotal!+170);expect(result.installation.missingComponents).toEqual([]);
  draft.material!.overrides!.accessQuote='0';expect(estimateMaterial(draft).installedCost).toBeCloseTo(result.indicativeSubtotal!+20);
});
it('a custom labour quotation does not silently include high-rise access',()=>{
  const draft=fixture();draft.material={...draft.material!,installationMethod:'difficult-access',overrides:{installationQuote:'100'}};
  const result=estimateMaterial(draft);expect(result.installationCost).toBe(100);expect(result.installedCost).toBeNull();
});
it('applies an optional minimum labour floor and mobilisation once per explicitly configured window',()=>{
  const draft=fixture();draft.material!.overrides={minimumLabourCharge:'100',mobilisationCharge:'30'};
  const result=estimateMaterial(draft);expect(result.installationCost).toBe(100);expect(result.indicativeSubtotal!.toFixed(2)).toBe('274.38');expect(result.installedCost!.toFixed(2)).toBe('304.38');
  expect(estimateMaterial(fixture()).installation.minimumLabourCharge).toBeNull();
});
it.each(['die-cut-frosted','specialist-markers','external-cords','architectural-glazing'])('does not apply a film rate to %s',id=>{
  const result=estimateMaterial(fixture(id));expect(result.installation.rate).toBeNull();expect(result.installationCost).toBeNull();expect(result.installedCost).toBeNull();
  expect(result.installation.missingComponents.length).toBeGreaterThan(0);
  if(id==='die-cut-frosted'){expect(result.preliminaryKnownSubtotal.toFixed(2)).toBe('135.63');expect(result.materialCost).not.toBeNull();}
});
it('supports DIY or an explicit labour quotation for individual markers without inventing a per-dot rate',()=>{
  const draft=fixture('die-cut-frosted');draft.material!.installationMethod='diy';expect(estimateMaterial(draft).installationCost).toBe(0);
  draft.material={...draft.material!,installationMethod:'standard',overrides:{installationQuote:'80'}};
  expect(estimateMaterial(draft).installationCost).toBe(80);expect(estimateMaterial(draft).installation.rate).toBeNull();
});
it('sums different installation methods across selected windows without early rounding',()=>{
  const a=fixture(),b=fixture('premium-clear-film');b.material!.installationMethod='conservative';
  const result=projectEstimate([a,b],{...emptyPlan(),entries:[planEntry(a),planEntry(b)]});
  expect(result.installationSubtotal!.toFixed(2)).toBe('164.69');expect(result.indicativeSubtotal!.toFixed(2)).toBe('571.56');
  const plan={...emptyPlan(),entries:[planEntry(a),{...planEntry(b),selected:false}]};expect(projectEstimate([a,b],plan).installationSubtotal).toBe(estimateMaterial(a).installationCost);
});
it('preserves old explicit labour quotes and accepts an explicit RM0 quote',()=>{
  const draft=fixture();draft.material!.overrides={installationQuote:'45'};expect(estimateMaterial(draft).installationCost).toBe(45);
  draft.material!.overrides.installationQuote='0';expect(estimateMaterial(draft).installationCost).toBe(0);
});
it('validates saved method/charge types, and retains method settings in JSON handoffs',()=>{
  const draft=fixture();draft.material={...draft.material!,installationMethod:'difficult-access',overrides:{minimumLabourCharge:'20',mobilisationCharge:'10'}};
  expect(isMaterialSelection(draft.material)).toBe(true);expect(createHandoff(draft,BASELINE_GUIDELINE).material).toEqual(draft.material);
  expect(isMaterialSelection({materialId:'x',installationMethod:'free-professional'})).toBe(false);
  expect(isMaterialSelection({materialId:'x',overrides:{mobilisationCharge:20}})).toBe(false);
});
it.each(['-1','NaN','Infinity'])('rejects invalid minimum labour %s',value=>{
  const draft=fixture();draft.material!.overrides={minimumLabourCharge:value};expect(()=>estimateMaterial(draft)).toThrow('minimum labour');
});
it('exports the method, rate, labour, material subtotal, source and missing access explicitly',()=>{
  const draft=fixture();draft.material!.installationMethod='difficult-access';
  const html=buildTreatmentReport([treatmentFor(draft)],{...emptyPlan(),entries:[planEntry(draft)]},true);
  for(const text of ['High-rise / difficult access','RM 3.50 / sq ft','RM 67.81','RM 174.38','RM 242.19','unpriced — not included',INSTALLATION_REFERENCE.sourceUrl,'Not a binding final installed quotation'])expect(html).toContain(text);
});
it('changes method immediately, preserves the pattern and stored quote, and keeps minimum charges optional',async()=>{
  let latest=fixture();latest.material!.overrides={installationQuote:'45'};const originalLayout=latest.layout;
  function Harness(){const[draft,setDraft]=useState(latest);return <MaterialPlanner window={draft} onChange={next=>{latest=next;setDraft(next);}}/>;}
  render(<Harness/>);const user=userEvent.setup();
  await user.selectOptions(screen.getByLabelText('Installation method'),'conservative');
  expect(latest.layout).toBe(originalLayout);expect(latest.material!.overrides!.installationQuote).toBe('45');expect(latest.material!.useInstallationQuote).toBe(false);
  expect(within(screen.getByRole('region',{name:'Estimated Treatment Cost'})).getAllByText('RM 271.25').length).toBeGreaterThan(0);
  await user.click(screen.getByText('Advanced Cost Settings'));
  expect((screen.getByLabelText('Minimum labour charge for this window (RM)') as HTMLInputElement).value).toBe('');
  fireEvent.change(screen.getByLabelText('Mobilisation charge for this window (RM)'),{target:{value:'20'}});
  await user.selectOptions(screen.getByLabelText('Installation method'),'difficult-access');
  expect(screen.getByText('Not included: High-rise / difficult-access charge.')).toBeTruthy();
});
