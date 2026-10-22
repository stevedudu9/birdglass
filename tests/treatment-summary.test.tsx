// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { createWindow, buildLayoutRequest } from '../src/features/member2/model';
import type { GuidelineProfile, WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { treatmentSummary } from '../src/demo/treatmentSummary';
import { Member3Results } from '../src/demo/Member3Results';
import { buildTreatmentReport } from '../src/demo/treatmentReport';
import { buildLayoutSheet } from '../src/demo/layoutSheet';
import { emptyPlan } from '../src/demo/planning';
import { loadProject } from '../src/demo/storage';
import * as images from '../src/features/member2/images';
import * as exports from '../src/features/member2/export';

vi.mock('../src/demo/storage',()=>({loadProject:vi.fn(),saveProject:vi.fn().mockResolvedValue(undefined)}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();window.history.replaceState({},'','/');});
const props={changed:false,inPlan:false,onAdd:()=>{},onExport:()=>{},onPlacement:()=>{}};
const photo={imageId:'test-photo',name:'window.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true as const,kind:'photo' as const};
function fixture(width='1200',height='1500',guideline:GuidelineProfile=BASELINE_GUIDELINE):WindowDraft {
  const draft:WindowDraft={...createWindow('Garden pane'),image:photo,dimensions:{width,height,unit:'mm'},corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
  draft.layout=generatePattern(buildLayoutRequest(draft,guideline),guideline);return draft;
}

it('keeps incomplete research checks visible even when saved metadata claims pass',()=>{
  const draft=fixture();draft.layout!.validation={status:'pass',issues:[]};
  expect(treatmentSummary(draft).status).toBe('incomplete');
  render(<Member3Results window={draft} {...props}/>);
  expect(screen.getByText('Pattern geometry checks passed')).toBeTruthy();
  expect(screen.getByText('Guideline reference: Team review pending')).toBeTruthy();
  expect(screen.queryByText(/Pattern validation passed/)).toBeNull();
  expect(screen.queryByText('Technical data')).toBeNull();
  expect(document.body.textContent).not.toContain(draft.windowId);
});

it('only reports pass after both validators pass, and rejects forged counts or failed provider status',()=>{
  const reviewed:GuidelineProfile={...BASELINE_GUIDELINE,status:'reviewed'};
  const draft=fixture('1200','1500',reviewed);
  expect(treatmentSummary(draft,reviewed).status).toBe('pass');
  for(const layout of [{...draft.layout!,dotCount:1},{...draft.layout!,validation:{status:'fail' as const,issues:['Provider check failed']}}]){
    const result=treatmentSummary({...draft,layout},reviewed);
    expect(result.status).toBe('fail');expect(result.treatment).toBeNull();
  }
});

it('shows unknown quantities before generation and never reuses an outdated layout',()=>{
  const draft=fixture();const {rerender}=render(<Member3Results window={{...draft,layout:null}} {...props}/>);
  expect(screen.getByText('Not checked')).toBeTruthy();
  expect(screen.queryByRole('button',{name:/Download treatment summary/})).toBeNull();
  rerender(<Member3Results window={{...draft,dimensionRevision:draft.dimensionRevision+1}} {...props}/>);
  expect(screen.getByText('Failed')).toBeTruthy();
  expect(screen.queryByText('720')).toBeNull();
});

it('does not invent spacing on a single-column axis',()=>{
  render(<Member3Results window={fixture('10','60')} {...props}/>);
  expect(screen.getByText(/Horizontal: Not applicable \(one column\)/)).toBeTruthy();
  expect(screen.getByText(/Vertical: 50 mm/)).toBeTruthy();
});

it('hides report identifiers by default while preserving opt-in debug exports and honest validation',()=>{
  const draft=fixture(),treatment=treatmentSummary(draft).treatment!;
  const html=buildTreatmentReport([treatment],emptyPlan());
  expect(html).toContain('Pattern validation incomplete');
  expect(html).not.toContain('Layout checks passed');
  expect(html).not.toContain(draft.windowId);
  expect(buildLayoutSheet(treatment)).not.toContain(draft.windowId);
  expect(buildTreatmentReport([treatment],emptyPlan(),false,undefined,{debugMode:true})).toContain(draft.windowId);
  expect(buildLayoutSheet(treatment,{debugMode:true})).toContain(draft.windowId);
});

it('completes upload, four-corner selection, measurement, generation, review and PNG download in normal mode',async()=>{
  window.history.replaceState({},'','/#assess');
  const draft=createWindow('Journey pane'),user=userEvent.setup();
  vi.mocked(loadProject).mockResolvedValue({version:1,windows:[draft],activeId:draft.windowId});
  vi.spyOn(images,'decodePhoto').mockResolvedValue(photo);
  const png=new Blob(['encoded PNG fixture'],{type:'image/png'});
  const encode=vi.spyOn(exports,'exportPreview').mockResolvedValue(png);
  const download=vi.spyOn(exports,'downloadBlob').mockImplementation(()=>{});
  vi.stubGlobal('PointerEvent',MouseEvent);
  render(<App/>);
  await screen.findByDisplayValue('Journey pane');
  await user.upload(screen.getByLabelText('Choose window photo'),new File(['photo fixture'],'window.png',{type:'image/png'}));
  const stage=await screen.findByRole('group',{name:'Window photo and perspective dot overlay'});
  vi.spyOn(stage,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:1000,bottom:800,width:1000,height:800,toJSON:()=>({})});
  for(const [clientX,clientY] of [[100,100],[900,100],[900,700],[100,700]])fireEvent.pointerDown(stage,{clientX,clientY});
  fireEvent.change(screen.getByLabelText('Measured width'),{target:{value:'120'}});
  fireEvent.change(screen.getByLabelText('Measured height'),{target:{value:'150'}});
  await user.selectOptions(screen.getByLabelText('Measurement unit'),'cm');
  await user.click(screen.getByRole('button',{name:'Generate preview'}));
  await screen.findByTestId('dot-overlay');
  await user.click(screen.getByRole('button',{name:'Select Standard Printed-Dot Film'}));
  const review=screen.getByRole('link',{name:/Review treatment & quantities/});
  expect(review.getAttribute('href')).toBe('#pattern-results');
  await user.click(review);
  const summary=screen.getByRole('region',{name:'Treatment Summary'});
  expect(summary.id).toBe('pattern-results');
  expect(within(summary).getByText('RM 174.38')).toBeTruthy();
  expect(within(summary).getByText('720')).toBeTruthy();
  expect(within(summary).getByText(/720 individual dots/)).toBeTruthy();
  expect(within(summary).getByText(/1.8 m² of full-pane film/)).toBeTruthy();
  expect(within(summary).getByText(/Horizontal: 50 mm/)).toBeTruthy();
  expect(within(summary).getByText('Pattern geometry checks passed')).toBeTruthy();
  for(const text of ['Advanced layout data','Export algorithm request','Export window JSON','Import layout data (JSON)','Technical data'])expect(screen.queryByText(text)).toBeNull();
  expect(document.body.textContent).not.toContain(draft.windowId);
  await user.click(screen.getByRole('button',{name:'Download image'}));
  await waitFor(()=>expect(download).toHaveBeenCalledWith(png,'birdglass-Journey-pane-preview.png'));
  expect(encode.mock.calls[0][0].layout.dotCount).toBe(720);
});

it('requires explicit debug opt-in to expose integration tools',async()=>{
  window.history.replaceState({},'','/?debug=1#assess');
  const draft=fixture();vi.mocked(loadProject).mockResolvedValue({version:1,windows:[draft],activeId:draft.windowId});
  render(<App/>);await screen.findByDisplayValue('Garden pane');
  expect(screen.getByText('Advanced layout data')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Export algorithm request'})).toBeTruthy();
  expect(screen.getByText('Technical data')).toBeTruthy();
});
