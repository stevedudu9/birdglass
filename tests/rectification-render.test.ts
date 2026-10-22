// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest';
import { rectifyPhoto } from '../src/features/member2/rectification';
import { loadImage } from '../src/features/member2/images';
import type { CornersNorm,ImageAsset } from '../src/features/member2/types';
vi.mock('../src/features/member2/images',()=>({loadImage:vi.fn()}));
const image:ImageAsset={imageId:'photo',name:'photo',dataUrl:'data:image/jpeg;base64,RlVMTA==',widthPx:6000,heightPx:4000,orientationNormalized:true,kind:'photo',preview:{dataUrl:'data:image/jpeg;base64,U01BTEw=',widthPx:2560,heightPx:1707}};
const corners:CornersNorm={tl:{u:0,v:0},tr:{u:1,v:0},br:{u:1,v:1},bl:{u:0,v:1}};
afterEach(()=>vi.restoreAllMocks());
function canvasApi(encode=true){
  const source={drawImage:vi.fn(),getImageData:vi.fn().mockReturnValue({data:new Uint8ClampedArray([10,20,30,255])})};
  const output={createImageData:vi.fn((w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)})),putImageData:vi.fn()};
  const canvases:HTMLCanvasElement[]=[];
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(this:HTMLCanvasElement){canvases.push(this);return (canvases.length===1?source:output) as unknown as CanvasRenderingContext2D;});
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue(encode?'data:image/png;base64,V0FSUA==':'data:,');
  vi.mocked(loadImage).mockResolvedValue({} as HTMLImageElement);
  return{canvases,source,output};
}
it('uses the retained original, bounded working surfaces and releases them after rendering',async()=>{
  const canvas=canvasApi();
  const result=await rectifyPhoto(image,corners,1,100000,new AbortController().signal,32);
  expect(loadImage).toHaveBeenCalledWith(image.dataUrl);expect(result).toEqual({dataUrl:'data:image/png;base64,V0FSUA==',width:1,height:32,glass:{x:0,y:0,width:1,height:32}});
  const draw=canvas.source.drawImage.mock.calls[0];expect(draw[3]*draw[4]).toBeLessThanOrEqual(8_010_000);expect(Math.max(draw[3],draw[4])).toBeLessThanOrEqual(4096);
  expect(canvas.output.putImageData).toHaveBeenCalledOnce();expect(canvas.canvases.every(c=>c.width===0&&c.height===0)).toBe(true);
  expect(image.widthPx).toBe(6000);expect(image.dataUrl).toBe('data:image/jpeg;base64,RlVMTA==');
});
it('releases working surfaces when encoding fails',async()=>{
  const canvas=canvasApi(false);await expect(rectifyPhoto(image,corners,1,100000,new AbortController().signal,32)).rejects.toThrow('could not be rendered');
  expect(canvas.canvases.every(c=>c.width===0&&c.height===0)).toBe(true);
});
it('cancels before decoding when already aborted',async()=>{
  vi.mocked(loadImage).mockClear();const controller=new AbortController();controller.abort();
  await expect(rectifyPhoto(image,corners,1000,1000,controller.signal)).rejects.toHaveProperty('name','AbortError');
  expect(loadImage).not.toHaveBeenCalled();
});
it('cancels a running warp and releases both canvases',async()=>{
  const canvas=canvasApi(),controller=new AbortController();
  const promise=rectifyPhoto(image,corners,1,100000,controller.signal,32);
  await Promise.resolve();controller.abort();await expect(promise).rejects.toHaveProperty('name','AbortError');
  expect(canvas.output.putImageData).not.toHaveBeenCalled();expect(canvas.canvases.every(c=>c.width===0&&c.height===0)).toBe(true);
});
it('renders every selected corner into a square even for the 950 × 18000 measurement',async()=>{
  const canvas=canvasApi();
  const result=await rectifyPhoto(image,corners,950,18000,new AbortController().signal,32,'square');
  expect(result).toEqual({dataUrl:'data:image/png;base64,V0FSUA==',width:32,height:32,glass:{x:0,y:0,width:32,height:32}});
  expect(canvas.output.createImageData).toHaveBeenCalledWith(32,32);
  expect(canvas.canvases.every(c=>c.width===0&&c.height===0)).toBe(true);
});
