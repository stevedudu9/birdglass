// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest';
import { decodePhoto } from '../src/features/member2/images';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function png(width=1200,height=800){
  const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);bytes.set([73,72,68,82],12);
  const view=new DataView(bytes.buffer);view.setUint32(16,width);view.setUint32(20,height);
  return {size:bytes.length,type:'image/png',name:'window.png',arrayBuffer:async()=>bytes.buffer} as File;
}
function canvas(){
  const context={fillStyle:'',fillRect:vi.fn(),drawImage:vi.fn()};
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/jpeg;base64,AAAA');
  return context;
}
it('uses orientation-corrected decoded dimensions as the coordinate basis',async()=>{
  const close=vi.fn(),decode=vi.fn().mockResolvedValue({width:800,height:1200,close});
  vi.stubGlobal('createImageBitmap',decode);canvas();
  const file=png(),asset=await decodePhoto(file);
  expect(decode).toHaveBeenCalledWith(file,{imageOrientation:'from-image'});
  expect(asset.widthPx).toBe(800);expect(asset.heightPx).toBe(1200);expect(asset.orientationNormalized).toBe(true);expect(close).toHaveBeenCalled();
});
it('retains native resolution and reduces only the overview copy',async()=>{
  const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:4000,height:3000,close}));canvas();
  const asset=await decodePhoto(png(4000,3000));expect(asset.widthPx).toBe(4000);expect(asset.heightPx).toBe(3000);
  expect(asset.preview?.widthPx).toBe(2560);expect(asset.preview?.heightPx).toBe(1920);expect(close).toHaveBeenCalledOnce();
});
it('rejects excessive pixel dimensions before decoding',async()=>{
  const decode=vi.fn();vi.stubGlobal('createImageBitmap',decode);
  await expect(decodePhoto(png(10000,10000))).rejects.toThrow('24 megapixels');expect(decode).not.toHaveBeenCalled();
});
it('rejects excessive file size before reading its bytes',async()=>{
  const arrayBuffer=vi.fn();await expect(decodePhoto({size:13*1024*1024,type:'image/png',arrayBuffer} as unknown as File)).rejects.toThrow('12 MB');expect(arrayBuffer).not.toHaveBeenCalled();
});
it('rejects unhelpfully narrow images and still releases decoded memory',async()=>{
  const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:1,height:10000,close}));
  await expect(decodePhoto(png(1,10000))).rejects.toThrow('too small or narrow');expect(close).toHaveBeenCalledOnce();
});
it('reports failed decoding without installing a new image',async()=>{
  vi.stubGlobal('createImageBitmap',vi.fn().mockRejectedValue(new Error('corrupt raster')));
  await expect(decodePhoto(png())).rejects.toThrow('could not be decoded');
});
it('retains a 24-megapixel portrait image and its orientation-corrected coordinate basis',async()=>{
  const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:4000,height:6000,close}));canvas();
  const asset=await decodePhoto(png(6000,4000));
  expect([asset.widthPx,asset.heightPx]).toEqual([4000,6000]);
  expect([asset.preview?.widthPx,asset.preview?.heightPx]).toEqual([1707,2560]);expect(close).toHaveBeenCalledOnce();
});
it('does not create a redundant overview for small photos',async()=>{
  vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:1200,height:800,close:vi.fn()}));canvas();
  expect((await decodePhoto(png())).preview).toBeUndefined();
});
it('encodes the full PNG without JPEG recompression, while using JPEG for the small overview',async()=>{
  vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:4000,height:3000,close:vi.fn()}));canvas();
  await decodePhoto(png(4000,3000));
  expect(vi.mocked(HTMLCanvasElement.prototype.toDataURL).mock.calls.map(args=>args[0])).toEqual(['image/png','image/jpeg']);
});
it('retains JPEG dimensions with separate full-image and overview encodings',async()=>{
  const bytes=new Uint8Array([255,216,255,192,0,8,8,11,184,15,160,0]);
  const file={size:bytes.length,type:'image/jpeg',name:'window.jpg',arrayBuffer:async()=>bytes.buffer} as File;
  vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:4000,height:3000,close:vi.fn()}));canvas();
  const asset=await decodePhoto(file);expect([asset.widthPx,asset.heightPx]).toEqual([4000,3000]);
  expect(vi.mocked(HTMLCanvasElement.prototype.toDataURL).mock.calls).toEqual([['image/jpeg',.96],['image/jpeg',.9]]);
});
it('rejects an unsupported image edge before attempting to decode it',async()=>{
  const decode=vi.fn();vi.stubGlobal('createImageBitmap',decode);
  await expect(decodePhoto(png(12001,1000))).rejects.toThrow('12,000');expect(decode).not.toHaveBeenCalled();
});
it('releases bitmap memory if full-resolution encoding fails',async()=>{
  const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn().mockResolvedValue({width:4000,height:3000,close}));canvas();
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:,');
  await expect(decodePhoto(png(4000,3000))).rejects.toThrow('could not retain');expect(close).toHaveBeenCalledOnce();
});
