import { expect,it } from 'vitest';
import { makeHomography,projectDots,transformPoint } from '../src/features/member2/geometry';
import { inverseHomography,rectifiedDotPath,rectifiedSize,scanCamera,warpRows } from '../src/features/member2/rectification';
import type { CornersNorm } from '../src/features/member2/types';

const square:CornersNorm={tl:{u:0,v:0},tr:{u:1,v:0},br:{u:1,v:1},bl:{u:0,v:1}};
const angled:CornersNorm={tl:{u:.2,v:.15},tr:{u:.85,v:.3},br:{u:.7,v:.9},bl:{u:.1,v:.7}};
it('maps the selected four photo corners to the four exact rectangle corners',()=>{
  const h=makeHomography(angled),inverse=inverseHomography(h);
  const expected=[[0,0],[1,0],[1,1],[0,1]];
  Object.values(angled).forEach((p,index)=>{
    const corrected=transformPoint(inverse,p.u,p.v);
    expect(corrected.u).toBeCloseTo(expected[index][0],12);expect(corrected.v).toBeCloseTo(expected[index][1],12);
  });
});
it('preserves interior positions through forward and inverse perspective mapping',()=>{
  const h=makeHomography(angled),inverse=inverseHomography(h);
  for(let x=0;x<=10;x++)for(let y=0;y<=10;y++){
    const photo=transformPoint(h,x/10,y/10),corrected=transformPoint(inverse,photo.u,photo.v);
    expect(corrected.u).toBeCloseTo(x/10,11);expect(corrected.v).toBeCloseTo(y/10,11);
  }
});
it.each([[950,18000],[3300,18000],[18000,950],[1000,1000]])('uses the measured %s × %s aspect ratio with bounded output', (w,h)=>{
  const size=rectifiedSize(w,h);expect(Math.max(size.width,size.height)).toBe(2048);
  expect(Math.abs(size.width-w/Math.max(w,h)*2048)).toBeLessThanOrEqual(.5);
  expect(Math.abs(size.height-h/Math.max(w,h)*2048)).toBeLessThanOrEqual(.5);
});
it('rejects invalid dimensions, crossed corners and singular maps',()=>{
  expect(()=>rectifiedSize(0,100)).toThrow();expect(()=>rectifiedSize(NaN,100)).toThrow();
  expect(()=>makeHomography({...angled,tr:angled.bl})).toThrow();
  expect(()=>inverseHomography([0,0,0,0,0,0,0,0,0])).toThrow();
});
it('keeps source pixels unchanged in an identity warp',()=>{
  const source=Uint8ClampedArray.from({length:4*3*4},(_,i)=>i*5%256),output=new Uint8ClampedArray(source.length);
  warpRows(source,4,3,output,4,3,makeHomography(square),0,3);expect(output).toEqual(source);
});
it('bilinearly samples the expected photo position for an angled interior pixel',()=>{
  const source=new Uint8ClampedArray(100*100*4);
  for(let y=0;y<100;y++)for(let x=0;x<100;x++){const i=(y*100+x)*4;source[i]=x*2;source[i+1]=y*2;source[i+2]=50;source[i+3]=255;}
  const output=new Uint8ClampedArray(5*5*4),h=makeHomography(angled);warpRows(source,100,100,output,5,5,h,0,5);
  const p=transformPoint(h,.5,.5),i=(2*5+2)*4;
  expect(output[i]).toBeCloseTo(Math.round((p.u*100-.5)*2),0);expect(output[i+1]).toBeCloseTo(Math.round((p.v*100-.5)*2),0);
  expect(output[i+2]).toBe(50);expect(output[i+3]).toBe(255);
});
it('rectifies projected dots back to physical positions and circular proportions',()=>{
  const dots=projectDots([{id:'one',xMm:250,yMm:500}],10,1000,2000,angled);
  const path=rectifiedDotPath({windowId:'one',layoutVersion:'one',photoRevision:1,projectedDots:dots},angled,1000,2000);
  const values=Array.from(path.matchAll(/[ML]([\d.-]+),([\d.-]+)/g),m=>[Number(m[1]),Number(m[2])]);
  expect(Math.max(...values.map(p=>p[0]))).toBe(255);expect(Math.min(...values.map(p=>p[0]))).toBe(245);
  expect(Math.max(...values.map(p=>p[1]))).toBe(505);expect(Math.min(...values.map(p=>p[1]))).toBe(495);
});
it.each([[950,18000],[3300,18000],[18000,950],[1000,1000]])('fits all of a %s × %s pane in a square camera without changing its ratio',(w,h)=>{
  const size=rectifiedSize(w,h),view=scanCamera(size.width,size.height,1);
  expect(view.width).toBe(view.height);expect(view.x).toBeLessThanOrEqual(0);expect(view.y).toBeLessThanOrEqual(0);
  expect(view.x+view.width).toBeGreaterThanOrEqual(size.width);expect(view.y+view.height).toBeGreaterThanOrEqual(size.height);
});
it('shows a complete square display without padding or cropping at Fit',()=>{
  expect(scanCamera(2048,2048,1)).toEqual({x:0,y:0,width:2048,height:2048});
});
it('crops to the selected pane and does not include surrounding pixels',()=>{
  const interior:CornersNorm={tl:{u:.25,v:.25},tr:{u:.75,v:.25},br:{u:.75,v:.75},bl:{u:.25,v:.75}};
  const source=new Uint8ClampedArray(8*8*4);for(let y=0;y<8;y++)for(let x=0;x<8;x++){const i=(y*8+x)*4;source[i]=x>=2&&x<6&&y>=2&&y<6?90:240;source[i+3]=255;}
  const output=new Uint8ClampedArray(4*4*4);warpRows(source,8,8,output,4,4,makeHomography(interior),0,4);
  for(let i=0;i<output.length;i+=4){expect(output[i]).toBe(90);expect(output[i+3]).toBe(255);}
});
it('pans a close-up to both ends and clamps it inside the pane',()=>{
  const size={width:2048,height:2048},zoom=2;
  const top=scanCamera(size.width,size.height,zoom,{x:-1e6,y:-1e6}),bottom=scanCamera(size.width,size.height,zoom,{x:1e6,y:1e6});
  expect(top.y).toBe(0);expect(bottom.y+bottom.height).toBe(size.height);
  expect(top.x).toBeCloseTo(0,10);expect(bottom.x+bottom.width).toBeCloseTo(size.width,10);
});
it('does not extend pixels through a perspective horizon',()=>{
  const output=new Uint8ClampedArray(4).fill(255);
  warpRows(new Uint8ClampedArray([255,255,255,255]),1,1,output,1,1,[1,0,0,0,1,0,-4,0,1],0,1);
  expect(output).toEqual(new Uint8ClampedArray(4));
});
