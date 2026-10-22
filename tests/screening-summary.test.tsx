// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { cleanup,render,screen,within,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createWindow,buildLayoutRequest } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { PriorityAssessment } from '../src/features/screening/PriorityAssessment';
import { effectiveScreening,isScreeningRecord } from '../src/features/screening/assessment';
import { screeningSummary } from '../src/features/screening/summary';
import type { Inputs } from '../src/features/screening/config';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { generatePattern } from '../src/features/member3';
import App from '../src/App';
import { loadProject,saveProject } from '../src/demo/storage';

vi.mock('../src/demo/storage',()=>({loadProject:vi.fn(),saveProject:vi.fn().mockResolvedValue(undefined)}));
beforeEach(()=>window.history.replaceState({},'','/#priority-assessment'));
afterEach(()=>{cleanup();vi.clearAllMocks();window.history.replaceState({},'','/');});
const complete:Inputs={collisions:'none',reflections:'minimal',transparency:'no',vegetation:'none',canopy:'above',architecture:'standard',attractants:'no',lighting:'low',treatment:'none'};
function fixture(inputs:Partial<Inputs>={},label='Garden pane'):WindowDraft {
 const draft:WindowDraft={...createWindow(label),dimensions:{width:'120',height:'150',unit:'cm'},screening:{inputs},
 image:{imageId:'fixture',name:'window.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'photo'},
 corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
 draft.layout=generatePattern(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
}
function Harness({initial}:{initial:WindowDraft}){const[draft,setDraft]=useState(initial);return <PriorityAssessment window={draft} onChange={setDraft}/>;}
function result(){return within(screen.getByRole('region',{name:'Preliminary screening result'}));}
it('shows all-unknown priority separately from completeness with readable genuine follow-up labels',async()=>{
 const draft=fixture(),before=structuredClone(draft);render(<Harness initial={draft}/>);const card=result();
 expect(card.getByRole('heading',{name:'Needs Review'})).toBeTruthy();expect(card.getByText('Assessment incomplete')).toBeTruthy();
 expect(card.getByText('0 of 9 observations recorded')).toBeTruthy();
 expect(card.getByText('Past collisions')).toBeTruthy();expect(card.getByText('Glass reflections')).toBeTruthy();
 expect(card.queryByText(/No default area cutoff|small-pane exemption|Unknown or unverified inputs require/)).toBeNull();
 expect(card.queryByText(/Follow-up needed:.*;/)).toBeNull();
 await userEvent.setup().click(card.getByRole('button',{name:'Complete Assessment'}));
 expect(document.activeElement).toBe(screen.getByRole('combobox',{name:/Documented past collisions/}));
 expect(draft).toEqual(before);
});
it('gives collisions High attention even with missing secondary answers and targets missing evidence',async()=>{
 render(<Harness initial={fixture({collisions:'yes'})}/>);const card=result();
 expect(card.getByRole('heading',{name:'High'})).toBeTruthy();expect(card.getByText('Assessment incomplete')).toBeTruthy();
 expect(card.getByText(/Documented past collisions are reported/)).toBeTruthy();
 expect(card.getByText('Collision observation details')).toBeTruthy();
 await userEvent.setup().click(card.getByRole('button',{name:'Complete Assessment'}));
 expect(document.activeElement).toBe(screen.getByLabelText('Collision observation / evidence reference'));
});
it('keeps multiple known hazard indicators High without listing them as missing',()=>{
 render(<Harness initial={fixture({reflections:'strong',vegetation:'close',treatment:'none'})}/>);const card=result();
 expect(card.getByRole('heading',{name:'High'})).toBeTruthy();expect(card.getByText(/Strong reflections and very close vegetation/)).toBeTruthy();
 expect(card.queryByText('Glass reflections')).toBeNull();expect(card.queryByText('Nearby vegetation')).toBeNull();
 expect(card.getByText('3 of 9 observations recorded')).toBeTruthy();
});
it('keeps a partially answered single-hazard assessment Medium and counts only actual follow-up',()=>{
 const draft=fixture({...complete,lighting:'moderate',canopy:'unknown'});render(<Harness initial={draft}/>);const card=result();
 expect(card.getByRole('heading',{name:'Medium'})).toBeTruthy();expect(card.getByText('Canopy height')).toBeTruthy();
 expect(card.getByText('1 item to review')).toBeTruthy();expect(card.queryByText('Past collisions')).toBeNull();
});
it('separates unverified treatment evidence from known hazard priority',()=>{
 render(<Harness initial={fixture({...complete,reflections:'strong',vegetation:'close',treatment:'verified'})}/>);const card=result();
 expect(card.getByRole('heading',{name:'High'})).toBeTruthy();expect(card.getByText('Verification needed')).toBeTruthy();
 expect(card.getByText('9 of 9 observations recorded')).toBeTruthy();expect(card.getByText('Whole-pane treatment verification')).toBeTruthy();
});
it('handles verified treatment with and without new collisions while retaining completeness independently',()=>{
 const draft=fixture({...complete,reflections:'strong',vegetation:'close',treatment:'verified'});draft.screening!.treatmentEvidence='Whole-pane exterior treatment inspection record A';
 const {rerender}=render(<PriorityAssessment window={draft} onChange={()=>{}}/>);
 expect(result().getByRole('heading',{name:'Lower'})).toBeTruthy();expect(result().getByText('Assessment complete')).toBeTruthy();
 const collision={...draft,screening:{...draft.screening!,inputs:{...draft.screening!.inputs,collisions:'yes' as const},collisionEvidence:'Observed strike on 17 October'}};
 rerender(<PriorityAssessment window={collision} onChange={()=>{}}/>);
 expect(result().getByRole('heading',{name:'High'})).toBeTruthy();expect(result().getByText('Assessment complete')).toBeTruthy();
 expect(result().getByText(/need reconciliation/)).toBeTruthy();
});
it('keeps completed known observations out of the follow-up list after input changes',async()=>{
 render(<Harness initial={fixture()}/>);await userEvent.setup().selectOptions(screen.getByRole('combobox',{name:/Glass reflections/}),'strong');
 expect(result().queryByText('Glass reflections')).toBeNull();expect(result().getByText('1 of 9 observations recorded')).toBeTruthy();
 expect(result().getByRole('heading',{name:'Medium'})).toBeTruthy();
});
it('does not equate High investigation attention with missing assessment inputs',()=>{
 const draft=fixture({...complete,collisions:'yes'});draft.screening!.collisionEvidence='Dated observation record';
 const model=screeningSummary(draft,effectiveScreening(draft));expect(model.completeness).toBe('Assessment complete');
 expect(model.followUps).toHaveLength(0);expect(effectiveScreening(draft).reviewRequired).toBe(true);
});
it('preserves selected answers per window across Home/Assess navigation and reloading saved records',async()=>{
 const first=fixture({reflections:'strong',vegetation:'close',lighting:'low'},'Garden pane'),second=fixture({...complete},'Lobby pane');
 vi.mocked(loadProject).mockResolvedValue({version:1,windows:[first,second],activeId:first.windowId});
 const {unmount}=render(<App/>);const user=userEvent.setup();await screen.findByDisplayValue('Garden pane');
 await user.selectOptions(screen.getByRole('combobox',{name:/Nearby bird attractants/}),'yes');
 const nav=within(screen.getByRole('navigation',{name:'Main navigation'}));
 await user.click(nav.getByRole('link',{name:'Home'}));await screen.findByRole('heading',{name:'Bird-Friendly Buildings for Healthier Townships'});
 await user.click(nav.getByRole('link',{name:'Assess'}));await screen.findByDisplayValue('Garden pane');
 expect((screen.getByRole('combobox',{name:/Glass reflections/}) as HTMLSelectElement).value).toBe('strong');
 expect((screen.getByRole('combobox',{name:/Nearby bird attractants/}) as HTMLSelectElement).value).toBe('yes');
 expect(result().getByRole('heading',{name:'High'})).toBeTruthy();
 await user.click(screen.getByRole('button',{name:/^Lobby pane/}));expect((screen.getByRole('combobox',{name:/Glass reflections/}) as HTMLSelectElement).value).toBe('minimal');
 await user.click(screen.getByRole('button',{name:/^Garden pane/}));
 await waitFor(()=>expect(vi.mocked(saveProject).mock.lastCall?.[0].windows[0].screening?.inputs.attractants).toBe('yes'));
 const saved=structuredClone(vi.mocked(saveProject).mock.lastCall![0]);expect(isScreeningRecord(saved.windows[0].screening)).toBe(true);
 unmount();vi.mocked(loadProject).mockResolvedValue(saved);render(<App/>);await screen.findByDisplayValue('Garden pane');
 expect((screen.getByRole('combobox',{name:/Glass reflections/}) as HTMLSelectElement).value).toBe('strong');
 expect((screen.getByRole('combobox',{name:/Nighttime lighting/}) as HTMLSelectElement).value).toBe('low');
 expect((screen.getByRole('combobox',{name:/Nearby bird attractants/}) as HTMLSelectElement).value).toBe('yes');
 expect(result().getByRole('heading',{name:'High'})).toBeTruthy();
});
