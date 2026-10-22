// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoStage } from '../src/features/member2/PhotoStage';
import type { CornersNorm,ImageAsset,PreviewResult } from '../src/features/member2/types';

const full='data:image/jpeg;base64,RlVMTA==',small='data:image/jpeg;base64,U01BTEw=';
const image:ImageAsset={imageId:'native-photo',name:'window.jpg',dataUrl:full,widthPx:6000,heightPx:4000,orientationNormalized:true,kind:'photo',preview:{dataUrl:small,widthPx:2560,heightPx:1707}};
const corners:CornersNorm={tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}};
const preview:PreviewResult={windowId:'one',layoutVersion:'layout-1',photoRevision:7,projectedDots:[{dotId:'one',centerNorm:{u:.5,v:.5},outlineNorm:[{u:.49,v:.5},{u:.5,v:.49},{u:.51,v:.5},{u:.5,v:.51}]}]};
const originalRequest=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'requestFullscreen');
const originalExit=Object.getOwnPropertyDescriptor(document,'exitFullscreen');
const originalElement=Object.getOwnPropertyDescriptor(document,'fullscreenElement');
afterEach(()=>{
  cleanup();vi.restoreAllMocks();document.body.style.overflow='';
  for(const [target,key,descriptor] of [[HTMLElement.prototype,'requestFullscreen',originalRequest],[document,'exitFullscreen',originalExit],[document,'fullscreenElement',originalElement]] as const){
    if(descriptor)Object.defineProperty(target,key,descriptor);else Reflect.deleteProperty(target,key);
  }
});
function mount(asset:ImageAsset=image,editing=false){
  const onCornersChange=vi.fn();
  const result=render(<PhotoStage image={asset} corners={corners} preview={preview} showDots editing={editing} onCornersChange={onCornersChange}/>);
  return{...result,onCornersChange,photo:()=>result.container.querySelector('image')!,path:()=>screen.getByTestId('dot-overlay').getAttribute('d')};
}
function nativeApi(){
  let active:Element|null=null;
  Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>active});
  const request=vi.fn(function(this:HTMLElement){active=this;document.dispatchEvent(new Event('fullscreenchange'));return Promise.resolve();});
  const exit=vi.fn(async()=>{active=null;document.dispatchEvent(new Event('fullscreenchange'));});
  Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:request});
  Object.defineProperty(document,'exitFullscreen',{configurable:true,value:exit});
  return{request,exit,escape:()=>{active=null;document.dispatchEvent(new Event('fullscreenchange'));}};
}
it('uses the overview at Fit and the full-resolution image on ordinary zoom',async()=>{
  const app=mount(),user=userEvent.setup();expect(app.photo().getAttribute('href')).toBe(small);
  await user.click(screen.getByRole('button',{name:'Zoom in'}));expect(app.photo().getAttribute('href')).toBe(full);
  await user.click(screen.getByRole('button',{name:'Fit'}));expect(app.photo().getAttribute('href')).toBe(small);
});
it('enters viewport fullscreen without native API and exits using Escape',async()=>{
  const app=mount(),user=userEvent.setup(),before=app.path();
  const button=screen.getByRole('button',{name:'Enter fullscreen'});button.focus();
  await user.click(button);expect(screen.getByRole('dialog',{name:'Fullscreen window preview'})).toBeTruthy();
  expect(app.photo().getAttribute('href')).toBe(full);expect(document.body.style.overflow).toBe('hidden');
  expect(app.path()).toBe(before);expect(app.onCornersChange).not.toHaveBeenCalled();
  await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).toBeNull();expect(app.photo().getAttribute('href')).toBe(small);
  expect(document.body.style.overflow).toBe('');expect(document.activeElement).toBe(button);
});
it('uses browser fullscreen when supported and exits through its button',async()=>{
  const api=nativeApi();mount();const user=userEvent.setup();
  await user.click(screen.getByRole('button',{name:'Enter fullscreen'}));expect(api.request).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button',{name:'Exit fullscreen'}));expect(api.exit).toHaveBeenCalledOnce();expect(screen.queryByRole('dialog')).toBeNull();
});
it('tracks browser-initiated fullscreen exit',async()=>{
  const api=nativeApi();const app=mount(),user=userEvent.setup();
  await user.click(screen.getByRole('button',{name:'Enter fullscreen'}));
  act(()=>api.escape());
  expect(screen.queryByRole('dialog')).toBeNull();expect(app.photo().getAttribute('href')).toBe(small);
});
it('keeps the expanded viewport usable when native fullscreen is denied',async()=>{
  Object.defineProperty(HTMLElement.prototype,'requestFullscreen',{configurable:true,value:vi.fn().mockRejectedValue(new Error('Denied'))});
  mount();const user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Enter fullscreen'}));
  expect(screen.getByRole('dialog')).toBeTruthy();await user.click(screen.getByRole('button',{name:'Exit fullscreen'}));expect(screen.queryByRole('dialog')).toBeNull();
});
it('preserves zoom and geometry through a fullscreen round trip',async()=>{
  const app=mount(),user=userEvent.setup(),before=app.path();await user.click(screen.getByRole('button',{name:'Zoom in'}));
  await user.click(screen.getByRole('button',{name:'Enter fullscreen'}));await user.click(screen.getByRole('button',{name:'Exit fullscreen'}));
  expect(screen.getByText('125%')).toBeTruthy();expect(app.path()).toBe(before);
  expect(app.container.querySelector('svg[viewBox="0 0 6000 4000"]')).toBeTruthy();expect(app.onCornersChange).not.toHaveBeenCalled();
});
it('falls back to existing image assets without an overview copy',async()=>{
  const app=mount({...image,preview:undefined}),user=userEvent.setup();expect(app.photo().getAttribute('href')).toBe(full);
  await user.click(screen.getByRole('button',{name:'Enter fullscreen'}));expect(app.photo().getAttribute('href')).toBe(full);
});
it('traps Tab within the fullscreen controls and restores scrolling on unmount',async()=>{
  document.body.style.overflow='auto';const app=mount(),user=userEvent.setup();
  await user.click(screen.getByRole('button',{name:'Enter fullscreen'}));await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('button',{name:'Zoom in'}));app.unmount();expect(document.body.style.overflow).toBe('auto');
});
it('keeps corner selection on the full-resolution coordinate basis in fullscreen',async()=>{
  const app=mount(image,true),user=userEvent.setup();await user.click(screen.getByRole('button',{name:'Enter fullscreen'}));
  fireEvent.keyDown(screen.getByRole('button',{name:'Adjust TL corner'}),{key:'ArrowRight'});
  expect(app.onCornersChange).toHaveBeenCalledWith({...corners,tl:{u:.101,v:.1}});
});
