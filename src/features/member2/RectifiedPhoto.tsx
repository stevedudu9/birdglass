import { useEffect,useMemo,useRef,useState } from 'react';
import { rectifyPhoto,rectifiedDotPath,scanCamera } from './rectification';
import type { RectifiedPhoto as CorrectedPhoto } from './rectification';
import type { CornersNorm,ImageAsset,PreviewResult } from './types';

type Props={image:ImageAsset;corners:CornersNorm;widthMm:number;heightMm:number;preview:PreviewResult|null;showDots:boolean;zoom:number};
export function RectifiedPhoto({image,corners,widthMm,heightMm,preview,showDots,zoom}:Props){
  const request=useMemo(()=>({image,corners,widthMm,heightMm}),[image,corners,widthMm,heightMm]);
  const [state,setState]=useState<{photo:CorrectedPhoto|null;error:string;request:typeof request|null}>({photo:null,error:'',request:null});
  const [dotsVisible,setDotsVisible]=useState(showDots);
  const [pan,setPan]=useState({x:0,y:0});
  const dragging=useRef<{clientX:number;clientY:number;x:number;y:number;units:number}|null>(null);
  useEffect(()=>{dragging.current=null;if(zoom===1)setPan({x:0,y:0});},[zoom]);
  useEffect(()=>setDotsVisible(showDots),[showDots]);
  useEffect(()=>{
    const controller=new AbortController();setState({photo:null,error:'',request});setPan({x:0,y:0});dragging.current=null;
    void rectifyPhoto(request.image,request.corners,request.widthMm,request.heightMm,controller.signal,2048,'square').then(photo=>{
      if(!controller.signal.aborted)setState({photo,error:'',request});
    }).catch((error:unknown)=>{if(!controller.signal.aborted)setState({photo:null,error:error instanceof Error?error.message:'Correction failed.',request});});
    return()=>controller.abort();
  },[request]);
  const photo=state.request===request?state.photo:null;
  const glass=photo?.glass??(photo?{x:0,y:0,width:photo.width,height:photo.height}:null);
  const path=useMemo(()=>photo&&glass?rectifiedDotPath(preview,corners,glass.width,glass.height):'',[photo,preview,corners]);
  const error=state.request===request?state.error:'';
  const view=photo?scanCamera(photo.width,photo.height,zoom,pan):null;
  const closeUp=!!photo&&!!view&&(view.width<photo.width||view.height<photo.height);
  return <>
    <div className="bg-front-compare"><div><strong>Square-corrected glass</strong><span>Measured size: {widthMm.toLocaleString()} × {heightMm.toLocaleString()} mm · display proportions adjusted</span></div><span className="bg-scan-badge">{closeUp?'Zoomed section':'Whole pane · square'}</span>
    </div>
    <section className="bg-scan-workspace" aria-label="Angle correction scanner preview">
      <div className="bg-scan-square" tabIndex={0} aria-label="Corrected image viewport; drag or use arrow keys to pan when zoomed"
        onKeyDown={event=>{if(!photo||!view||zoom<=1)return;const directions:Record<string,[number,number]>={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};const direction=directions[event.key];if(!direction)return;event.preventDefault();setPan({x:view.x+view.width/2-photo.width/2+direction[0]*view.width*.15,y:view.y+view.height/2-photo.height/2+direction[1]*view.height*.15});}}>
      {photo?<div className="bg-scan-content">
      <svg viewBox={`${view!.x} ${view!.y} ${view!.width} ${view!.height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Front view of calibrated glass"
        style={{touchAction:'none',cursor:zoom>1?'grab':'default'}}
        onPointerDown={event=>{if(event.button!==0||zoom<=1)return;const bounds=event.currentTarget.getBoundingClientRect();if(bounds.width<=0)return;dragging.current={clientX:event.clientX,clientY:event.clientY,x:view!.x+view!.width/2-photo.width/2,y:view!.y+view!.height/2-photo.height/2,units:view!.width/bounds.width};event.currentTarget.setPointerCapture(event.pointerId);}}
        onPointerMove={event=>{const start=dragging.current;if(start)setPan({x:start.x-(event.clientX-start.clientX)*start.units,y:start.y-(event.clientY-start.clientY)*start.units});}}
        onPointerUp={()=>{dragging.current=null;}} onPointerCancel={()=>{dragging.current=null;}} onLostPointerCapture={()=>{dragging.current=null;}}>
        <image href={photo.dataUrl} width={photo.width} height={photo.height}/>
        {dotsVisible&&path&&<path data-testid="rectified-dot-overlay" d={path} transform={`translate(${glass!.x} ${glass!.y})`} fill="#fff" pointerEvents="none"/>}
        <rect data-testid="rectified-glass-boundary" x={glass!.x} y={glass!.y} width={glass!.width} height={glass!.height} fill="none" stroke="#86d3a0" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
      </svg>
      </div>:error?<p className="bg-error" role="alert">{error} Return to Original perspective to adjust the input.</p>:<p className="bg-rectifying" role="status">Correcting the glass perspective…</p>}
      </div>
    </section>
    <div className="bg-scan-footer"><p>{closeUp?'Drag or use arrow keys to inspect; Fit restores all four corners.':'All four selected corners fill the square. Saved dimensions and dot calculations are unchanged.'}</p><button className="bg-fullscreen-button" type="button" disabled={!photo} aria-pressed={dotsVisible} onClick={()=>setDotsVisible(value=>!value)}>{dotsVisible?'Hide dots':'Show dots'}</button></div>
    <p className="bg-context-hint">Square display changes visible proportions, including dot shapes. Use Original perspective to check their appearance on the real pane.</p>
  </>;
}
