// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest';
import { exportPreview } from '../src/features/member2/export';
import { loadImage } from '../src/features/member2/images';
import type { WindowHandoff } from '../src/features/member2/types';
vi.mock('../src/features/member2/images',()=>({loadImage:vi.fn()}));
afterEach(()=>vi.restoreAllMocks());
const full='data:image/jpeg;base64,RlVMTA==',small='data:image/jpeg;base64,U01BTEw=';
function handoff(){return{
  imageAsset:{imageId:'one',name:'photo',dataUrl:full,widthPx:6000,heightPx:4000,orientationNormalized:true,kind:'photo',preview:{dataUrl:small,widthPx:2560,heightPx:1707}},
  input:{widthMm:950,heightMm:1800},layout:{dotCount:1},validation:{status:'incomplete'},preview:{projectedDots:[{dotId:'a',centerNorm:{u:.5,v:.5},outlineNorm:[{u:.4,v:.4},{u:.6,v:.4},{u:.6,v:.6}]}]},
} as WindowHandoff;}
function mockCanvas(fail=false){
  const image={} as HTMLImageElement;vi.mocked(loadImage).mockResolvedValue(image);
  const ctx={drawImage:vi.fn(),beginPath:vi.fn(),moveTo:vi.fn(),lineTo:vi.fn(),closePath:vi.fn(),fill:vi.fn(),fillRect:vi.fn(),fillText:vi.fn(),fillStyle:'',font:''};
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  let renderedSize:number[]=[];let surface:HTMLCanvasElement|undefined;
  vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(function(this:HTMLCanvasElement,callback){
    surface=this;renderedSize=[this.width,this.height];callback(fail?null:new Blob(['png'],{type:'image/png'}));
  });
  return{ctx,image,size:()=>renderedSize,surface:()=>surface!};
}
it('exports from the full-resolution photo and coordinates, not the overview copy',async()=>{
  const canvas=mockCanvas();const blob=await exportPreview(handoff());
  expect(loadImage).toHaveBeenCalledWith(full);expect(canvas.ctx.drawImage).toHaveBeenCalledWith(canvas.image,0,0,6000,4000);
  expect(canvas.size()).toEqual([6000,4540]);expect(canvas.ctx.moveTo).toHaveBeenCalledWith(2400,1600);expect(blob.type).toBe('image/png');
  expect([canvas.surface().width,canvas.surface().height]).toEqual([0,0]);
});
it('releases the high-resolution export canvas after a failed encoding',async()=>{
  const canvas=mockCanvas(true);await expect(exportPreview(handoff())).rejects.toThrow('PNG export failed');
  expect([canvas.surface().width,canvas.surface().height]).toEqual([0,0]);
});
