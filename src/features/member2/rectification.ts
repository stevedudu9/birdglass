import { makeHomography, transformPoint } from './geometry';
import type { Homography } from './geometry';
import type { CornersNorm, ImageAsset, PreviewResult } from './types';
import { loadImage } from './images';

export type GlassBounds={x:number;y:number;width:number;height:number};
export type RectifiedPhoto={dataUrl:string;width:number;height:number;glass?:GlassBounds};

/** The square viewing camera can zoom and pan without changing the calibrated image's shape. */
export function scanCamera(width:number,height:number,zoom:number,offset={x:0,y:0}){
  const side=Math.max(width,height)/Math.max(1,zoom);
  const center=(size:number,shift:number)=>side>=size?size/2:Math.max(side/2,Math.min(size-side/2,size/2+shift));
  return {x:center(width,offset.x)-side/2,y:center(height,offset.y)-side/2,width:side,height:side};
}

export function inverseHomography(h:Homography):Homography {
  const [a,b,c,d,e,f,g,k,i]=h;
  const inverse=[e*i-f*k,c*k-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*k-e*g,b*g-a*k,a*e-b*d];
  const determinant=a*inverse[0]+b*inverse[3]+c*inverse[6];
  if(!Number.isFinite(determinant)||Math.abs(determinant)<1e-12)throw new Error('The selected perspective cannot be corrected reliably.');
  return inverse.map(value=>value/determinant);
}

export function rectifiedSize(widthMm:number,heightMm:number,maxEdge=2048):{width:number;height:number} {
  if(![widthMm,heightMm,maxEdge].every(value=>Number.isFinite(value)&&value>0))throw new Error('Enter the actual measured width and height first.');
  const scale=maxEdge/Math.max(widthMm,heightMm);
  return {width:Math.max(1,Math.round(widthMm*scale)),height:Math.max(1,Math.round(heightMm*scale))};
}

/** Dot outlines return to the physical pane's unit square through the inverse of the same photo mapping. */
export function rectifiedDotPath(preview:PreviewResult|null,corners:CornersNorm,width:number,height:number):string {
  if(!preview)return '';
  const inverse=inverseHomography(makeHomography(corners));
  return preview.projectedDots.map(dot=>dot.outlineNorm.map((p,index)=>{
    const point=transformPoint(inverse,p.u,p.v);
    return `${index?'L':'M'}${(point.u*width).toFixed(3)},${(point.v*height).toFixed(3)}`;
  }).join('')+'Z').join('');
}

/** Inverse sampling prevents holes; pixel centres use the same unit-square mapping as the overlay. */
export function warpRows(source:Uint8ClampedArray,sourceWidth:number,sourceHeight:number,target:Uint8ClampedArray,width:number,height:number,h:Homography,startRow:number,endRow:number):void {
  for(let y=startRow;y<endRow;y++)for(let x=0;x<width;x++){
    const u=(x+.5)/width,v=(y+.5)/height;
    const denominator=h[6]*u+h[7]*v+h[8],index=(y*width+x)*4;
    // Invalid mappings must not repeat or smear pixels outside the source image.
    if(!Number.isFinite(denominator)||denominator<=1e-8){target.fill(0,index,index+4);continue;}
    const point={u:(h[0]*u+h[1]*v+h[2])/denominator,v:(h[3]*u+h[4]*v+h[5])/denominator};
    if(!Number.isFinite(point.u)||!Number.isFinite(point.v)||point.u<0||point.u>1||point.v<0||point.v>1){target.fill(0,index,index+4);continue;}
    const sx=Math.max(0,Math.min(sourceWidth-1,point.u*sourceWidth-.5));
    const sy=Math.max(0,Math.min(sourceHeight-1,point.v*sourceHeight-.5));
    const x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(sourceWidth-1,x0+1),y1=Math.min(sourceHeight-1,y0+1),dx=sx-x0,dy=sy-y0;
    const indices=[(y0*sourceWidth+x0)*4,(y0*sourceWidth+x1)*4,(y1*sourceWidth+x0)*4,(y1*sourceWidth+x1)*4];
    const weights=[(1-dx)*(1-dy),dx*(1-dy),(1-dx)*dy,dx*dy];
    for(let channel=0;channel<4;channel++)target[index+channel]=indices.reduce((value,offset,i)=>value+source[offset+channel]*weights[i],0);
  }
}

export async function rectifyPhoto(image:ImageAsset,corners:CornersNorm,widthMm:number,heightMm:number,signal:AbortSignal,maxEdge=2048,displayMode:'physical'|'square'='physical'):Promise<RectifiedPhoto> {
  const h=makeHomography(corners),measuredSize=rectifiedSize(widthMm,heightMm,maxEdge);
  const edge=Math.max(1,Math.min(2048,Math.round(maxEdge)));
  // Square display maps the complete selected quadrilateral to a square; dimensions remain metadata/calibration.
  const size=displayMode==='square'?{width:edge,height:edge}:measuredSize;
  const check=()=>{if(signal.aborted)throw new DOMException('Correction cancelled','AbortError');};
  check();const photo=await loadImage(image.dataUrl);check();
  const source=document.createElement('canvas'),target=document.createElement('canvas');
  try {
    // A bounded working raster is temporary. The original retained image is never replaced.
    const scale=Math.min(1,4096/Math.max(image.widthPx,image.heightPx),Math.sqrt(8_000_000/(image.widthPx*image.heightPx)));
    source.width=Math.max(1,Math.round(image.widthPx*scale));source.height=Math.max(1,Math.round(image.heightPx*scale));
    const context=source.getContext('2d',{willReadFrequently:true});
    target.width=size.width;target.height=size.height;
    const output=target.getContext('2d');
    if(!context||!output)throw new Error('Perspective correction is unavailable in this browser.');
    context.drawImage(photo,0,0,source.width,source.height);
    const pixels=context.getImageData(0,0,source.width,source.height),result=output.createImageData(size.width,size.height);
    for(let row=0;row<size.height;row+=32){
      check();warpRows(pixels.data,source.width,source.height,result.data,size.width,size.height,h,row,Math.min(size.height,row+32));
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    check();output.putImageData(result,0,0);
    const dataUrl=target.toDataURL('image/png');
    if(!dataUrl.startsWith('data:image/png;base64,'))throw new Error('The corrected preview could not be rendered.');
    return {dataUrl,...size,glass:{x:0,y:0,...size}};
  }finally{source.width=0;source.height=0;target.width=0;target.height=0;}
}
