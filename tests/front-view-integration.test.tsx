// @vitest-environment jsdom
// Offline DOM interaction checks, not real-browser fullscreen or screenshot evidence.
import { useState } from 'react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { BirdGlassWindowEditor } from '../src/features/member2/BirdGlassWindowEditor';
import { createWindow,buildLayoutRequest } from '../src/features/member2/model';
import { generatePattern,calculateLayout } from '../src/features/member3';
import { BASELINE_GUIDELINE as guideline } from '../src/config/baseline';
import { rectifyPhoto } from '../src/features/member2/rectification';
import * as exports from '../src/features/member2/export';
import type { WindowDraft } from '../src/features/member2/types';

vi.mock('../src/features/member2/rectification',async()=>{
  const actual=await vi.importActual<typeof import('../src/features/member2/rectification')>('../src/features/member2/rectification');
  return {...actual,rectifyPhoto:vi.fn()};
});
const requestDescriptor=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'requestFullscreen');
const exitDescriptor=Object.getOwnPropertyDescriptor(document,'exitFullscreen');
const fullscreenDescriptor=Object.getOwnPropertyDescriptor(document,'fullscreenElement');
beforeEach(()=>vi.mocked(rectifyPhoto).mockResolvedValue({dataUrl:'data:image/png;base64,U1FVQVJF',width:2048,height:2048,glass:{x:0,y:0,width:2048,height:2048}}));
afterEach(()=>{
  cleanup();vi.restoreAllMocks();vi.resetAllMocks();document.body.style.overflow='';
  for(const [target,key,descriptor] of [[HTMLElement.prototype,'requestFullscreen',requestDescriptor],[document,'exitFullscreen',exitDescriptor],[document,'fullscreenElement',fullscreenDescriptor]] as const){if(descriptor)Object.defineProperty(target,key,descriptor);else Reflect.deleteProperty(target,key);}
});
const image={imageId:'shared-source',name:'DOM-fixture.jpg',dataUrl:'data:image/jpeg;base64,RlVMTA==',widthPx:6000,heightPx:4000,orientationNormalized:true as const,kind:'photo' as const};
function draft(label='Task 2',width=1200,height=1500):WindowDraft {
  const value:WindowDraft={...createWindow(label),image,dimensions:{width:String(width),height:String(height),unit:'mm'},corners:{tl:{u:.1,v:.1},tr:{u:.85,v:.15},br:{u:.75,v:.9},bl:{u:.2,v:.8}}};
  value.layout=generatePattern(buildLayoutRequest(value,guideline),guideline);return value;
}
function mount(){let current=draft();function Harness(){const[value,setValue]=useState(current);return <BirdGlassWindowEditor value={value} guideline={guideline} calculateLayout={calculateLayout} onChange={next=>{current=next;setValue(next);}}/>;}render(<Harness/>);return ()=>current;}
const front=async()=>{fireEvent.click(screen.getByRole('button',{name:'Front view'}));return await screen.findByRole('img',{name:'Front view of calibrated glass'});};

it('keeps real generated geometry stable through square view, zoom, pan, fullscreen, dot toggle and Escape',async()=>{
  const current=mount(),count=current().layout!.dotCount,version=current().layout!.layoutVersion,original=screen.getByTestId('dot-overlay').getAttribute('d');
  const svg=await front(),correctedPath=screen.getByTestId('rectified-dot-overlay').getAttribute('d');
  fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));
  fireEvent.keyDown(screen.getByLabelText('Corrected image viewport; drag or use arrow keys to pan when zoomed'),{key:'ArrowDown'});
  const view=svg.getAttribute('viewBox');
  fireEvent.click(screen.getByRole('button',{name:'Enter fullscreen'}));expect(screen.getByRole('dialog')).toBeTruthy();
  expect(svg.getAttribute('viewBox')).toBe(view);expect(screen.getByTestId('rectified-dot-overlay').getAttribute('d')).toBe(correctedPath);
  fireEvent.click(screen.getByRole('button',{name:'Hide dots'}));expect(screen.queryByTestId('rectified-dot-overlay')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Show dots'}));expect(screen.getByTestId('rectified-dot-overlay').getAttribute('d')).toBe(correctedPath);
  fireEvent.keyDown(screen.getByRole('dialog'),{key:'Escape'});await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
  expect(svg.getAttribute('viewBox')).toBe(view);expect(current().layout!.dotCount).toBe(count);expect(current().layout!.layoutVersion).toBe(version);
  fireEvent.click(screen.getByRole('button',{name:'Original perspective'}));expect(screen.getByTestId('dot-overlay').getAttribute('d')).toBe(original);
});
it('handles a browser-originated native fullscreen exit while retaining the square view',async()=>{
  let active:Element|null=null;
  Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>active});
  Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:function(this:HTMLElement){active=this;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();}});
  Object.defineProperty(document,'exitFullscreen',{configurable:true,value:async()=>{active=null;document.dispatchEvent(new Event('fullscreenchange'));}});
  mount();const svg=await front();fireEvent.click(screen.getByRole('button',{name:'Enter fullscreen'}));await waitFor(()=>expect(screen.getByRole('dialog')).toBeTruthy());
  act(()=>{active=null;document.dispatchEvent(new Event('fullscreenchange'));});
  expect(screen.queryByRole('dialog')).toBeNull();expect(svg.getAttribute('viewBox')).toBe('0 0 2048 2048');expect(screen.getByTestId('rectified-dot-overlay')).toBeTruthy();
});
it('clears the square overlay on a dimension edit and regenerates against the new measured input',async()=>{
  const current=mount();await front();expect(current().layout!.dotCount).toBe(720);
  fireEvent.change(screen.getByLabelText('Measured width'),{target:{value:'1000'}});
  expect(current().layout).toBeNull();expect(screen.queryByTestId('rectified-dot-overlay')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Generate preview'}));await screen.findByTestId('rectified-dot-overlay');
  expect(current().layout!.dotCount).toBe(600);expect(current().layout!.actualCenterPitchXmm).toBe(50);
});
it('downloads the original-perspective full-resolution handoff while square view is open',async()=>{
  const current=mount();await front();const png=new Blob(['fixture'],{type:'image/png'});
  const encode=vi.spyOn(exports,'exportPreview').mockResolvedValue(png),download=vi.spyOn(exports,'downloadBlob').mockImplementation(()=>{});
  fireEvent.click(screen.getByRole('button',{name:'Download image'}));await waitFor(()=>expect(download).toHaveBeenCalledOnce());
  const value=encode.mock.calls[0][0];expect(value.imageAsset).toEqual(image);expect(value.input.widthMm).toBe(1200);expect(value.layout.dotCount).toBe(current().layout!.dotCount);
  expect(value.preview.projectedDots[0].centerNorm.u).toBeGreaterThan(0);expect(value.preview.projectedDots[0].centerNorm.u).toBeLessThan(1);
});
it('refreshes square photo and overlay when two panes share an image but have different selections',async()=>{
  const a=draft('W-A'),b=draft('W-B',1400,1000);b.corners={tl:{u:.2,v:.2},tr:{u:.9,v:.2},br:{u:.85,v:.85},bl:{u:.25,v:.9}};
  function Harness(){const[values,setValues]=useState([a,b]),[active,setActive]=useState(0);return <><button onClick={()=>setActive(0)}>Case A</button><button onClick={()=>setActive(1)}>Case B</button><BirdGlassWindowEditor value={values[active]} guideline={guideline} calculateLayout={calculateLayout} onChange={next=>setValues(old=>old.map((value,index)=>index===active?next:value))}/></>;}
  render(<Harness/>);await front();const first=screen.getByTestId('rectified-dot-overlay').getAttribute('d');
  fireEvent.click(screen.getByRole('button',{name:'Case B'}));await waitFor(()=>expect(screen.getByTestId('rectified-dot-overlay').getAttribute('d')).not.toBe(first));
  expect((screen.getByLabelText('Measured width') as HTMLInputElement).value).toBe('1400');
  fireEvent.click(screen.getByRole('button',{name:'Case A'}));await waitFor(()=>expect(screen.getByTestId('rectified-dot-overlay').getAttribute('d')).toBe(first));
  expect((screen.getByLabelText('Measured width') as HTMLInputElement).value).toBe('1200');
});

