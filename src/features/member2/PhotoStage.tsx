import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent, KeyboardEvent } from 'react';
import { CORNER_KEYS } from './types';
import type { CornerKey, CornersNorm, ImageAsset, PreviewResult, PointNorm } from './types';
import { pointerToNorm, validateCorners } from './geometry';
import { RectifiedPhoto } from './RectifiedPhoto';
import './photo-fullscreen.css';

type Props={image:ImageAsset;corners:Partial<CornersNorm>;preview:PreviewResult|null;showDots:boolean;editing:boolean;onCornersChange:(value:Partial<CornersNorm>)=>void;dimensions?:{widthMm:number;heightMm:number}|null};
export function PhotoStage({image,corners,preview,showDots,editing,onCornersChange,dimensions}:Props){
  const svg=useRef<SVGSVGElement>(null),drag=useRef<CornerKey|null>(null);
  const [zoom,setZoom]=useState(1);
  const [frontView,setFrontView]=useState(false);
  const canCorrect=!!dimensions&&[dimensions.widthMm,dimensions.heightMm].every(value=>Number.isFinite(value)&&value>0)&&validateCorners(corners).length===0;
  const corrected=frontView&&canCorrect;
  const maxZoom=3;
  const [fullscreen,setFullscreen]=useState(false);
  const stage=useRef<HTMLDivElement>(null),fullscreenButton=useRef<HTMLButtonElement>(null);
  const previousFocus=useRef<HTMLElement|null>(null),nativeFullscreen=useRef(false),fullscreenRequest=useRef(0);
  const fullscreenHint=useId();
  const useFullResolution=fullscreen||zoom>1;
  const imageSource=useFullResolution?image.dataUrl:(image.preview?.dataUrl??image.dataUrl);
  useEffect(()=>{
    const element=stage.current;
    function changed(){
      drag.current=null;
      if(document.fullscreenElement===element){nativeFullscreen.current=true;setFullscreen(true);}
      else if(nativeFullscreen.current){nativeFullscreen.current=false;setFullscreen(false);}
    }
    document.addEventListener('fullscreenchange',changed);
    return()=>{
      fullscreenRequest.current++;
      document.removeEventListener('fullscreenchange',changed);
      if(element&&document.fullscreenElement===element)void document.exitFullscreen?.().catch(()=>{});
    };
  },[]);
  useEffect(()=>{
    if(!fullscreen)return;
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';fullscreenButton.current?.focus();
    return()=>{document.body.style.overflow=overflow;previousFocus.current?.focus();};
  },[fullscreen]);
  async function enterFullscreen(){
    drag.current=null;
    previousFocus.current=document.activeElement as HTMLElement|null;
    const token=++fullscreenRequest.current;
    setFullscreen(true);
    try{
      if(stage.current?.requestFullscreen){
        const element=stage.current;
        await element.requestFullscreen();
        if(token!==fullscreenRequest.current&&document.fullscreenElement===element)await document.exitFullscreen();
      }
    }catch{
      // The viewport-filling presentation remains available when native fullscreen is unavailable or denied.
    }
  }
  async function exitFullscreen(){
    drag.current=null;
    fullscreenRequest.current++;
    if(document.fullscreenElement===stage.current&&document.exitFullscreen){
      try{await document.exitFullscreen();}catch{return;}
    }
    nativeFullscreen.current=false;setFullscreen(false);
  }
  function fullscreenKeys(event:KeyboardEvent<HTMLDivElement>){
    if(!fullscreen)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();void exitFullscreen();return;}
    if(event.key!=='Tab')return;
    const controls=Array.from(stage.current?.querySelectorAll<HTMLElement>('button,[tabindex="0"]')??[]).filter(control=>!control.hasAttribute('disabled'));
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
  const latest=useRef(corners);latest.current=corners;
  const glassOutline=useMemo(()=>preview?.outlineNorm?preview.outlineNorm.map((p,i)=>`${i?'L':'M'}${(p.u*image.widthPx).toFixed(2)},${(p.v*image.heightPx).toFixed(2)}`).join('')+'Z':'',[preview,image.widthPx,image.heightPx]);
  const outline=useMemo(()=>preview?.projectedDots.map(dot=>dot.outlineNorm.map((p,i)=>`${i?'L':'M'}${(p.u*image.widthPx).toFixed(3)},${(p.v*image.heightPx).toFixed(3)}`).join('')+'Z').join('')??'',[preview,image.widthPx,image.heightPx]);
  const nextCorner=CORNER_KEYS.find(key=>!corners[key]);
  function point(event:PointerEvent):PointNorm|null {
    const bounds=svg.current?.getBoundingClientRect();
    return bounds?pointerToNorm(event.clientX,event.clientY,bounds,image.widthPx,image.heightPx):null;
  }
  function move(event:PointerEvent){
    if(!drag.current||!editing)return;
    const p=point(event);if(p)onCornersChange({...latest.current,[drag.current]:p});
  }
  function nudge(event:KeyboardEvent<SVGGElement>,key:CornerKey){
    const delta=event.shiftKey ? .01 : .001;
    const directions:Record<string,[number,number]>={ArrowLeft:[-delta,0],ArrowRight:[delta,0],ArrowUp:[0,-delta],ArrowDown:[0,delta]};
    const direction=directions[event.key],p=corners[key];if(!direction||!p||!editing)return;event.preventDefault();
    onCornersChange({...corners,[key]:{u:Math.max(0,Math.min(1,p.u+direction[0])),v:Math.max(0,Math.min(1,p.v+direction[1]))}});
  }
  const scale=Math.max(image.widthPx,image.heightPx)/1000;
  return <div ref={stage} className={`bg-photo-wrap${fullscreen?' bg-photo-fullscreen':''}${corrected?' bg-photo-front-view':''}`} data-zoomed={zoom>1}
    role={fullscreen?'dialog':undefined} aria-modal={fullscreen?true:undefined} aria-label={fullscreen?'Fullscreen window preview':undefined}
    aria-describedby={fullscreen?fullscreenHint:undefined} onKeyDown={fullscreenKeys}>
    {corrected?<RectifiedPhoto image={image} corners={corners as CornersNorm} widthMm={dimensions!.widthMm} heightMm={dimensions!.heightMm} preview={preview} showDots={showDots} zoom={zoom}/>:<div className="bg-photo-scroll">
      <div className="bg-photo-content" style={{width:`${zoom*100}%`}}>
        <svg ref={svg} viewBox={`0 0 ${image.widthPx} ${image.heightPx}`} role="group" aria-label="Window photo and perspective dot overlay"
          style={{touchAction:editing?'none':'auto'}} onPointerMove={move}
          onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
          onPointerDown={event=>{if(!editing||!nextCorner)return;const p=point(event);if(p)onCornersChange({...corners,[nextCorner]:p});}}>
          <image href={imageSource} width={image.widthPx} height={image.heightPx}/>
          {glassOutline&&<path data-testid="glass-outline" d={glassOutline} fill="none" stroke="#f3c969" strokeWidth={Math.max(image.widthPx/400,2)} strokeDasharray={`${Math.max(image.widthPx/120,6)} ${Math.max(image.widthPx/200,4)}`} pointerEvents="none"/>}
          {showDots&&outline&&<path data-testid="dot-overlay" d={outline} fill="#fff" pointerEvents="none"/>}
          {editing&&<>
            <polyline points={CORNER_KEYS.filter(k=>corners[k]).map(k=>`${corners[k]!.u*image.widthPx},${corners[k]!.v*image.heightPx}`).join(' ')+(CORNER_KEYS.every(k=>corners[k])?` ${corners.tl!.u*image.widthPx},${corners.tl!.v*image.heightPx}`:'')}
              fill="none" stroke="#d9f792" strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none"/>
            {CORNER_KEYS.map(key=>{const p=corners[key];return p&&<g key={key} role="button" tabIndex={0} aria-label={`Adjust ${key.toUpperCase()} corner`} className="bg-corner"
              transform={`translate(${p.u*image.widthPx} ${p.v*image.heightPx})`} onKeyDown={event=>nudge(event,key)}
              onPointerDown={event=>{event.stopPropagation();drag.current=key;event.currentTarget.setPointerCapture(event.pointerId);}}>
              <circle r={24*scale} fill="transparent"/>
              <circle r={10*scale} fill="#e0f9a0" stroke="#174f42" strokeWidth={2} vectorEffect="non-scaling-stroke"/>
              <rect x={14*scale} y={-28*scale} width={34*scale} height={24*scale} rx={4*scale} fill="#174f42"/>
              <text x={31*scale} y={-11*scale} textAnchor="middle" fill="#fff" fontSize={13*scale} fontWeight="700">{key.toUpperCase()}</text>
            </g>;})}
          </>}
        </svg>
      </div>
    </div>}
    <div className="bg-image-toolbar"><span>{image.kind==='illustration'?'Illustrated example':'Your photo'} · {image.widthPx} × {image.heightPx} px · {corrected?'Front view · temporary preview up to 2048 px':editing?'Adjust glass corners':'Photo preview'}{!corrected&&useFullResolution?' · Full resolution':''}</span>
      <div className="bg-photo-tools"><div className="bg-zoom"><button type="button" aria-label="Zoom out" disabled={zoom<=1} onClick={()=>setZoom(v=>Math.max(1,v-(corrected?Math.max(.25,v*.2):.25)))}>−</button><span>{Math.round(zoom*100)}%</span><button type="button" aria-label="Zoom in" disabled={zoom>=maxZoom} onClick={()=>setZoom(v=>Math.min(maxZoom,v+(corrected?Math.max(.25,v*.2):.25)))}>+</button><button type="button" title="Show the entire image" onClick={()=>setZoom(1)}>Fit</button></div>
        <button type="button" className="bg-fullscreen-button" disabled={!canCorrect&&!corrected} aria-pressed={corrected} title={canCorrect?'Map all four glass corners to the square display':'Mark four valid corners and enter measured dimensions first'} onClick={()=>{drag.current=null;setZoom(1);setFrontView(!corrected);}}>{corrected?'Original perspective':'Front view'}</button>
        <button ref={fullscreenButton} type="button" className="bg-fullscreen-button" aria-label={fullscreen?'Exit fullscreen':'Enter fullscreen'} aria-pressed={fullscreen}
          onClick={()=>void(fullscreen?exitFullscreen():enterFullscreen())}>
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d={fullscreen?'M7 2V7H2M13 2V7H18M7 18V13H2M13 18V13H18':'M2 7V2H7M13 2H18V7M18 13V18H13M7 18H2V13'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {fullscreen?'Exit fullscreen':'Fullscreen'}
        </button>
      </div>
    </div>
    <p className="bg-angle-test-hint">Angle correction · {corrected?'The complete selected glass is mapped to a square display. Return to Original perspective to edit corners.':'Mark four corners and enter measured dimensions, then try Front view.'} This cannot restore missing photo detail.</p>
    {fullscreen&&<p className="bg-fullscreen-hint" id={fullscreenHint}>{corrected?'Corrected glass preview · zoom and drag to inspect':'Full-resolution photo · zoom and scroll to inspect'} · press Esc or Exit fullscreen to return.</p>}
  </div>;
}

