import { expect,it } from 'vitest';
import { createWindow,buildWindowInput } from '../src/features/member2/model';
import { isStoredWindowDraft } from '../src/demo/storage';
import type { WindowDraft } from '../src/features/member2/types';

function draft():WindowDraft{return{...createWindow('Native-resolution pane'),
  dimensions:{width:'950',height:'1800',unit:'mm'},corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}},
  image:{imageId:'native-image',name:'photo.jpg',dataUrl:'data:image/jpeg;base64,RlVMTA==',widthPx:6000,heightPx:4000,orientationNormalized:true,kind:'photo',
    preview:{dataUrl:'data:image/jpeg;base64,U01BTEw=',widthPx:2560,heightPx:1707}}};}
it('accepts and serializes the native basis while preserving preview metadata',()=>{
  const value=JSON.parse(JSON.stringify(draft())),input=buildWindowInput(value);
  expect([input.imageWidthPx,input.imageHeightPx]).toEqual([6000,4000]);expect(input.cornersNorm).toEqual(value.corners);
  expect(isStoredWindowDraft(value)).toBe(true);expect(value.image.preview.widthPx).toBe(2560);
});
it('continues accepting legacy saved images without a preview',()=>{
  const value=draft();value.image={...value.image!,widthPx:2560,heightPx:1707,preview:undefined};
  expect(isStoredWindowDraft(value)).toBe(true);expect(buildWindowInput(value).imageWidthPx).toBe(2560);
});
it('rejects impossible retained pixel dimensions at both public input and storage boundaries',()=>{
  const value=draft();value.image={...value.image!,widthPx:6000,heightPx:6000};
  expect(isStoredWindowDraft(value)).toBe(false);expect(()=>buildWindowInput(value)).toThrow('24 megapixel');
});
it('rejects malformed optional overview assets during reload validation',()=>{
  const value=draft();value.image!.preview={dataUrl:'https://example.com/untrusted.jpg',widthPx:2560,heightPx:1707};
  expect(isStoredWindowDraft(value)).toBe(false);
  value.image!.preview={dataUrl:'data:image/jpeg;base64,U01BTEw=',widthPx:3000,heightPx:2000};expect(isStoredWindowDraft(value)).toBe(false);
});
