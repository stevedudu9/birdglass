// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BirdGlassWindowEditor } from '../src/features/member2/BirdGlassWindowEditor';
import { createWindow,buildLayoutRequest } from '../src/features/member2/model';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { makeReferenceLayout } from '../src/demo/referenceLayout';
import type { LayoutProvider,WindowDraft } from '../src/features/member2/types';
import * as images from '../src/features/member2/images';
import * as geometry from '../src/features/member2/geometry';
import * as exports from '../src/features/member2/export';

afterEach(()=>{cleanup();vi.restoreAllMocks();});
const ready=():WindowDraft=>{
  const draft:WindowDraft={...createWindow('Test glass'),dimensions:{width:'120',height:'150',unit:'cm'},
    image:{imageId:'photo-1',name:'sample.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'photo'},
    corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.2},br:{u:.8,v:.9},bl:{u:.2,v:.8}}};
  draft.layout=makeReferenceLayout(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
};
const provider:LayoutProvider=async(request,guideline)=>makeReferenceLayout(request,guideline);
function harness(initial:WindowDraft,calculateLayout:LayoutProvider=provider,debugMode=false){
  let last=initial;
  function Harness(){const[value,setValue]=useState(initial);return <BirdGlassWindowEditor value={value} onChange={v=>{last=v;setValue(v);}} guideline={BASELINE_GUIDELINE} calculateLayout={calculateLayout} debugMode={debugMode}/>;}
  const result=render(<Harness/>);return{...result,current:()=>last};
}
describe('Member 2 editor interactions',()=>{
  it('reuses projection when renamed, exports the current label and reprojects changed corners',async()=>{
    const initial=ready(),callback=vi.fn(),project=vi.spyOn(geometry,'projectDots'),download=vi.spyOn(exports,'downloadJson').mockImplementation(()=>{});
    function Harness(){const[value,setValue]=useState(initial);return <BirdGlassWindowEditor value={value} onChange={setValue} guideline={BASELINE_GUIDELINE} onPreviewReady={callback} debugMode/>;}
    render(<Harness/>);
    const originalPreview=callback.mock.lastCall![0];
    expect(project).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText('Window name'),{target:{value:'Renamed pane'}});
    expect(callback.mock.lastCall![0]).toBe(originalPreview);
    expect(project).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Advanced layout data'));
    fireEvent.click(screen.getByRole('button',{name:'Export window JSON'}));
    expect(download.mock.calls[0][0]).toMatchObject({input:{label:'Renamed pane'},preview:{layoutVersion:initial.layout!.layoutVersion}});
    const afterExportCalls=project.mock.calls.length;
    fireEvent.click(screen.getByRole('button',{name:'Edit corners'}));
    fireEvent.keyDown(screen.getByRole('button',{name:'Adjust TL corner'}),{key:'ArrowRight'});
    expect(project).toHaveBeenCalledTimes(afterExportCalls+1);
    expect(callback.mock.lastCall![0].photoRevision).toBe(1);
    expect(callback.mock.lastCall![0].projectedDots[0].centerNorm).not.toEqual(originalPreview.projectedDots[0].centerNorm);
    fireEvent.change(screen.getByLabelText('Measured width'),{target:{value:''}});
    expect(callback.mock.lastCall![0]).toBeNull();
    expect(screen.queryByTestId('dot-overlay')).toBeNull();
  });
  it('renders the fixed baseline and toggles the same projected geometry',async()=>{
    harness(ready());const user=userEvent.setup();
    expect(screen.getByText('10 mm white dots')).toBeTruthy();expect(screen.getByText('50 × 50 mm centre to centre')).toBeTruthy();
    const path=screen.getByTestId('dot-overlay').getAttribute('d');expect(path?.length).toBeGreaterThan(100);
    await user.click(screen.getByRole('button',{name:'Original'}));expect(screen.queryByTestId('dot-overlay')).toBeNull();
    await user.click(screen.getByRole('button',{name:'With dots'}));expect(screen.getByTestId('dot-overlay').getAttribute('d')).toBe(path);
  });
  it('invalidates the overlay immediately on bad measurement and regenerates after correction',async()=>{
    const app=harness(ready()),user=userEvent.setup(),width=screen.getByLabelText('Measured width');
    await user.clear(width);await user.type(width,'-1');
    expect(screen.queryByTestId('dot-overlay')).toBeNull();expect(app.current().layout).toBeNull();
    expect((screen.getByRole('button',{name:'Generate preview'}) as HTMLButtonElement).disabled).toBe(true);
    await user.clear(width);await user.type(width,'100');await user.click(screen.getByRole('button',{name:'Generate preview'}));
    await waitFor(()=>expect(screen.queryByTestId('dot-overlay')).not.toBeNull());
    expect(app.current().layout?.dotCount).toBe(600);expect(app.current().layout?.actualCenterPitchXmm).toBe(50);
  });
  it('moves a corner using the keyboard without changing physical count or layout version',async()=>{
    const initial=ready(),app=harness(initial),user=userEvent.setup();
    await user.click(screen.getByRole('button',{name:'Edit corners'}));
    const handle=screen.getByRole('button',{name:'Adjust TL corner'});fireEvent.keyDown(handle,{key:'ArrowRight'});
    expect(app.current().corners.tl?.u).toBeCloseTo(.101);expect(app.current().layout?.layoutVersion).toBe(initial.layout?.layoutVersion);
    expect(app.current().layout?.dotCount).toBe(initial.layout?.dotCount);expect(app.current().photoRevision).toBe(1);
  });
  it('does not apply a late calculation after the dimensions change',async()=>{
    const initial=ready();initial.layout=null;let finish:(v:unknown)=>void=()=>{};
    const delayed:LayoutProvider=()=>new Promise(resolve=>{finish=resolve;});const app=harness(initial,delayed),user=userEvent.setup();
    await user.click(screen.getByRole('button',{name:'Generate preview'}));await user.clear(screen.getByLabelText('Measured width'));
    await act(async()=>{finish(makeReferenceLayout(buildLayoutRequest(initial,BASELINE_GUIDELINE),BASELINE_GUIDELINE));});
    expect(app.current().layout).toBeNull();expect(screen.queryByTestId('dot-overlay')).toBeNull();
  });
  it('rejects a malformed external layout instead of replacing the valid preview',async()=>{
    const initial=ready(),app=harness(initial,provider,true),user=userEvent.setup();
    await user.click(screen.getByText('Advanced layout data'));
    fireEvent.change(screen.getByLabelText('Import layout data (JSON)'),{target:{value:'{"valid":true}'}});
    await user.click(screen.getByRole('button',{name:'Validate & use layout'}));
    expect(screen.getByRole('alert').textContent).toContain('windowId');expect(app.current().layout).toBe(initial.layout);
  });
  it('clears corners and layout when a new photo is decoded',async()=>{
    const initial=ready(),app=harness(initial),user=userEvent.setup();
    vi.spyOn(images,'decodePhoto').mockResolvedValue({...initial.image!,imageId:'new-photo'});
    await user.upload(screen.getByLabelText('Replace photo'),new File(['fake test payload'],'new.png',{type:'image/png'}));
    await waitFor(()=>expect(app.current().image?.imageId).toBe('new-photo'));
    expect(app.current().corners).toEqual({});expect(app.current().layout).toBeNull();expect(screen.queryByTestId('dot-overlay')).toBeNull();
  });
  it('disables a second upload while an image decode is pending',async()=>{
    const initial=ready(),app=harness(initial);
    // The upload control is intentionally disabled while decoding, so a second user upload cannot race it.
    vi.spyOn(images,'decodePhoto').mockImplementation(()=>new Promise(()=>{}));
    fireEvent.change(screen.getByLabelText('Replace photo'),{target:{files:[new File(['x'],'a.png',{type:'image/png'})]}});
    expect((screen.getByLabelText('Replace photo') as HTMLInputElement).disabled).toBe(true);
    expect(app.current().image?.imageId).toBe('photo-1');
  });
  it('clears the preview callback when inputs become incomplete',async()=>{
    const initial=ready(),callback=vi.fn(),user=userEvent.setup();
    function Wrapper(){const[value,setValue]=useState(initial);return <BirdGlassWindowEditor value={value} onChange={setValue} guideline={BASELINE_GUIDELINE} calculateLayout={provider} onPreviewReady={callback} debugMode/>;}
    render(<Wrapper/>);expect(callback.mock.lastCall?.[0]?.layoutVersion).toBe(initial.layout?.layoutVersion);
    await user.click(screen.getByRole('button',{name:'Reset four corners'}));expect(callback.mock.lastCall?.[0]).toBeNull();
  });
});
