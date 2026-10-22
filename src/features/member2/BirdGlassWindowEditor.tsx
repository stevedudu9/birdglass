import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CORNER_KEYS } from './types';
import type { CornersNorm, GuidelineProfile, LayoutProvider, PreviewResult, ShapeEntry, Unit, WindowDraft, WindowInput } from './types';
import { acceptLayout, buildLayoutRequest, buildWindowInput, readDimensions, readShape, requestIsCurrent, setCorners, setDimensions, setImage, setShape, PREVIEW_NOTICE, LIMITS } from './model';
import { parseLayout, validateLayout } from './validation';
import { projectDots, projectOutline, validateCorners } from './geometry';
import { decodePhoto } from './images';
import { createHandoff, downloadBlob, downloadJson, exportPreview } from './export';
import { PhotoStage } from './PhotoStage';
import './member2.css';

export type BirdGlassWindowEditorProps={
  value:WindowDraft;onChange:(value:WindowDraft)=>void;guideline:GuidelineProfile;
  calculateLayout?:LayoutProvider;onInputReady?:(input:WindowInput|null)=>void;
  onPreviewReady?:(preview:PreviewResult|null)=>void;
  onLoadSample?:()=>void;details?:ReactNode;debugMode?:boolean;
};
export function BirdGlassWindowEditor({value,onChange,guideline,calculateLayout,onInputReady,onPreviewReady,onLoadSample,details,debugMode=false}:BirdGlassWindowEditorProps){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[exporting,setExporting]=useState(false);
  const [editing,setEditing]=useState(false),[showDots,setShowDots]=useState(true),[layoutText,setLayoutText]=useState('');
  const latest=useRef({value,guideline,onChange});latest.current={value,guideline,onChange};
  const requestToken=useRef(0),uploadToken=useRef(0);
  useEffect(()=>()=>{requestToken.current++;uploadToken.current++;},[]);
  useEffect(()=>{requestToken.current++;setBusy(false);},[value.dimensionRevision,value.windowId,guideline.id,guideline.version]);
  const inputResult=useMemo(()=>{try{return {input:buildWindowInput(value),error:''};}catch(e){return{input:null,error:(e as Error).message};}},[value]);
  const cornerIssues=useMemo(()=>validateCorners(value.corners),[value.corners]);
  const dimensions=useMemo(()=>{try{return readDimensions(value.dimensions);}catch{return null;}},[value.dimensions]);
  const shape:ShapeEntry=value.shape??{kind:'rectangle'};
  const shapeIssue=useMemo(()=>{if(!dimensions||shape.kind==='rectangle')return '';try{readShape(value);return '';}catch(e){return (e as Error).message;}},[dimensions,value.shape,value.dimensions]);
  const capacityIssue=useMemo(()=>{
    if(!dimensions)return '';
    const diameter=guideline.dotDiameterMm,px=guideline.targetCenterPitchXmm,py=guideline.targetCenterPitchYmm;
    if(![diameter,px,py].every(size=>Number.isFinite(size)&&size>0))return 'Pattern settings are unavailable. Reload the page or use a supported treatment profile.';
    if(dimensions.widthMm<diameter||dimensions.heightMm<diameter)return `The glass must be at least ${diameter} mm wide and high to fit one complete dot. Check the measured size and unit.`;
    const count=(Math.floor((dimensions.widthMm-diameter)/px)+1)*(Math.floor((dimensions.heightMm-diameter)/py)+1);
    return count>LIMITS.dots?`This pane needs ${count.toLocaleString('en-MY')} dots, above the ${LIMITS.dots.toLocaleString('en-MY')}-dot preview limit. Check the units and select one actual glass pane. If these measurements are correct, this pane exceeds the current preview capacity.`:'';
  },[dimensions,guideline]);
  const check=useMemo(()=>value.layout&&inputResult.input?validateLayout(value.layout,inputResult.input,guideline):null,[value.layout,inputResult.input,guideline]);
  const result=useMemo<{preview:PreviewResult|null;error:string}>(()=>{
    if(!value.layout||!check?.geometryPassed||!inputResult.input)return {preview:null,error:''};
    try{return {preview:{windowId:value.windowId,layoutVersion:value.layout.layoutVersion,photoRevision:value.photoRevision,
      projectedDots:projectDots(value.layout.dotsMm,value.layout.dotDiameterMm,inputResult.input.widthMm,inputResult.input.heightMm,value.corners as CornersNorm),
      ...(inputResult.input.outlineMm?{outlineNorm:projectOutline(inputResult.input.outlineMm,inputResult.input.widthMm,inputResult.input.heightMm,value.corners as CornersNorm)}:{})},error:''};}
    catch(e){return {preview:null,error:(e as Error).message};}
    // Labels and other metadata do not change the projected geometry. Exports revalidate current data.
  },[value.layout,value.corners,value.windowId,value.photoRevision,inputResult.input?.widthMm,inputResult.input?.heightMm,inputResult.input?.outlineMm,check?.geometryPassed]);
  const preview=result.preview;
  const nextCorner=CORNER_KEYS.find(key=>!value.corners[key]);
  useEffect(()=>{onInputReady?.(inputResult.input);},[inputResult.input,onInputReady]);
  useEffect(()=>{onPreviewReady?.(preview);},[preview,onPreviewReady]);

  async function upload(file:File|undefined){
    if(!file)return;const token=++uploadToken.current;const windowId=value.windowId;setUploading(true);setError('');
    requestToken.current++;setBusy(false);
    try{
      const image=await decodePhoto(file);
      if(token!==uploadToken.current||latest.current.value.windowId!==windowId)return;
      latest.current.onChange(setImage(latest.current.value,image));setEditing(true);setShowDots(true);
    }catch(e){if(token===uploadToken.current)setError((e as Error).message);}
    finally{if(token===uploadToken.current)setUploading(false);}
  }
  async function generate(){
    if(!calculateLayout)return;setError('');const token=++requestToken.current;
    try{
      const request=buildLayoutRequest(value,guideline);setBusy(true);
      const response=await calculateLayout(request,guideline);
      if(token!==requestToken.current||!requestIsCurrent(latest.current.value,request,latest.current.guideline))return;
      const parsed=parseLayout(response),currentInput=buildWindowInput(latest.current.value);
      const validation=validateLayout(parsed,currentInput,latest.current.guideline);
      if(!validation.geometryPassed)throw new Error(validation.issues.join(' '));
      latest.current.onChange(acceptLayout(latest.current.value,request,parsed,latest.current.guideline));setEditing(false);setShowDots(true);
    }catch(e){if(token===requestToken.current)setError((e as Error).message);}
    finally{if(token===requestToken.current)setBusy(false);}
  }
  function importLayout(){
    setError('');try{
      if(layoutText.length>2_000_000)throw new Error('Layout JSON must be smaller than 2 million characters.');
      const parsed=parseLayout(JSON.parse(layoutText));const input=buildWindowInput(value),validation=validateLayout(parsed,input,guideline);
      if(!validation.geometryPassed)throw new Error(validation.issues.join(' '));
      requestToken.current++;setBusy(false);onChange({...value,layout:parsed});setEditing(false);setShowDots(true);setLayoutText('');
    }catch(e){setError((e as Error).message);}
  }
  async function png(){
    if(!preview)return;setExporting(true);setError('');
    const name=(value.label||'window').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,60)||'window';
    try{downloadBlob(await exportPreview(createHandoff(value,guideline)),`birdglass-${name}-preview.png`);}catch(e){setError((e as Error).message);}finally{setExporting(false);}
  }
  function json(){
    if(!preview)return;setError('');
    try{downloadJson(createHandoff(value,guideline),`birdglass-${value.windowId.slice(0,8)}-handoff.json`);}catch(e){setError((e as Error).message);}
  }
  return <div className="birdglass-editor">
    <div className="bg-editor-grid">
      <section id="photo-workspace" className="bg-workspace" aria-label="Photo workspace">
        <div className="bg-workspace-heading"><div><span className="bg-eyebrow">Photo workspace</span><h2>{value.image?'Your window, in view.':'Start with your window.'}</h2></div>
          {value.image&&<label className="bg-button bg-secondary">{uploading?'Reading image…':'Replace photo'}<input aria-label="Replace photo" type="file" accept="image/jpeg,image/png" disabled={uploading} onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/></label>}
        </div>
        {value.image?<>
          <div className="bg-preview-controls">
            <div className="bg-segment"><button type="button" className={showDots?'active':''} onClick={()=>setShowDots(true)}>With dots</button><button type="button" className={!showDots?'active':''} onClick={()=>setShowDots(false)}>Original</button></div>
            <button type="button" className="bg-text-button" aria-pressed={editing} onClick={()=>setEditing(v=>!v)}>{editing?'Finish corner editing':'Edit corners'}</button>
          </div>
          <PhotoStage key={value.image.imageId} image={value.image} corners={value.corners} preview={preview} showDots={showDots} editing={editing||!!nextCorner} dimensions={dimensions} onCornersChange={corners=>{setError('');onChange(setCorners(value,corners));}}/>
          <p className="bg-stage-hint">{nextCorner?`Click the ${nextCorner.toUpperCase()} glass corner next. Follow TL → TR → BR → BL.`:editing?'Drag the labelled handles onto the glass edges. Arrow keys move a focused handle; Shift moves faster.':PREVIEW_NOTICE}</p>
          {cornerIssues.length>0&&!nextCorner&&<p className="bg-error" role="alert">{cornerIssues[0]}</p>}
          <div className="bg-export-row"><a className="bg-text-button" href="#pattern-results">{preview?'Review treatment & quantities ↓':'Complete the inputs to generate a preview'}</a>
            <button type="button" className="bg-button bg-secondary" disabled={!preview||exporting} onClick={()=>void png()}>{exporting?'Exporting…':'Download image'}</button></div>
        </>:<div className="bg-upload" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void upload(e.dataTransfer.files[0]);}}>
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="10" y="9" width="44" height="46" rx="5" stroke="currentColor" strokeWidth="2"/><path d="M10 39L25 25L39 40L46 33L54 40M32 9V55" stroke="currentColor" strokeWidth="2"/></svg>
          <h3>A clear view makes a better preview.</h3><p>Choose a photo with all four corners of one flat glass pane visible.</p>
          <label className="bg-button bg-primary">{uploading?'Reading image…':'Choose window photo'}<input aria-label="Choose window photo" type="file" accept="image/jpeg,image/png" disabled={uploading} onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/></label>
          <span className="bg-muted">JPEG or PNG · up to 12 MB / 24 MP · stays on this device</span>
          {onLoadSample&&<button className="bg-text-button" type="button" onClick={onLoadSample}>Explore the illustrated sample</button>}
        </div>}
        {(error||result.error)&&<div className="bg-error" role="alert">{error||result.error}</div>}
        {check&&!check.geometryPassed&&<div className="bg-error" role="alert">{check.issues.join(' ')}</div>}
        {debugMode&&<details className="bg-integration"><summary>Advanced layout data</summary>
          <p>Geometry checks verify physical dot positions, count, grid spacing and circle boundaries. Site installation and ecological performance require separate review.</p>
          {check&&<ul>{[...check.issues,...check.pending].map(issue=><li key={issue}>{issue}</li>)}</ul>}
          <div className="bg-actions"><button className="bg-button bg-secondary" disabled={!inputResult.input} onClick={()=>downloadJson(buildLayoutRequest(value,guideline),'birdglass-layout-request.json')}>Export algorithm request</button>
          <button className="bg-button bg-secondary" disabled={!preview} onClick={json}>Export window JSON</button></div>
          <label className="bg-field">Import layout data (JSON)<textarea rows={6} maxLength={2_000_000} value={layoutText} onChange={event=>setLayoutText(event.target.value)} placeholder="Paste compatible layout data"/></label>
          <button className="bg-button bg-secondary" disabled={!layoutText.trim()||!inputResult.input} onClick={importLayout}>Validate & use layout</button>
          <p className="bg-muted">Window {value.windowId} · dimension revision {value.dimensionRevision} · photo revision {value.photoRevision}</p>
        </details>}
      </section>
      <aside id="calibrate" className="bg-input-panel" aria-label="Window inputs">
        <div className="bg-panel-heading"><span className="bg-eyebrow">Window details</span></div>
        <label className="bg-field">Window name<input maxLength={80} value={value.label} onChange={event=>onChange({...value,label:event.target.value})}/></label>
        <div className="bg-section-label"><h3>Measured dimensions</h3><span>01</span></div>
        <p className="bg-help">Measure the exposed glass, excluding the frame. Enter its actual width and height; the photograph alone does not provide a scale.</p>
        <div className="bg-dimensions"><label className="bg-field">Width<input aria-label="Measured width" inputMode="decimal" value={value.dimensions.width} onChange={event=>{setError('');onChange(setDimensions(value,{...value.dimensions,width:event.target.value}));}} placeholder="e.g. 120"/></label>
          <label className="bg-field">Height<input aria-label="Measured height" inputMode="decimal" value={value.dimensions.height} onChange={event=>{setError('');onChange(setDimensions(value,{...value.dimensions,height:event.target.value}));}} placeholder="e.g. 150"/></label>
          <label className="bg-field">Unit<select aria-label="Measurement unit" value={value.dimensions.unit} onChange={event=>onChange(setDimensions(value,{...value.dimensions,unit:event.target.value as Unit}))}><option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option></select></label></div>
        {dimensions&&<p className="bg-measurement">{dimensions.widthMm.toLocaleString()} × {dimensions.heightMm.toLocaleString()} mm</p>}
        <label className="bg-field">Glass shape<select aria-label="Glass shape" value={shape.kind} onChange={event=>{setError('');onChange(setShape(value,{...shape,kind:event.target.value as ShapeEntry['kind']}));}}>
          <option value="rectangle">Rectangle</option><option value="arch">Arched top</option><option value="raked">Sloped top / triangle</option><option value="custom">Custom outline</option></select></label>
        {shape.kind!=='rectangle'&&<p className="bg-help">For a shaped pane, width and height are its overall bounding box, and the four photo corners mark that box's corners.</p>}
        {shape.kind==='arch'&&<label className="bg-field">Arch rise ({value.dimensions.unit})<input aria-label="Arch rise" inputMode="decimal" value={shape.rise??''} onChange={event=>onChange(setShape(value,{...shape,rise:event.target.value}))} placeholder="Springline to top; half the width for a semicircle"/></label>}
        {shape.kind==='raked'&&<div className="bg-dimensions"><label className="bg-field">Shorter side<select aria-label="Shorter side" value={shape.shortSide??'left'} onChange={event=>onChange(setShape(value,{...shape,shortSide:event.target.value as 'left'|'right'}))}><option value="left">Left</option><option value="right">Right</option></select></label>
          <label className="bg-field">Its height ({value.dimensions.unit})<input aria-label="Shorter side height" inputMode="decimal" value={shape.shortHeight??''} onChange={event=>onChange(setShape(value,{...shape,shortHeight:event.target.value}))} placeholder="0 for a triangle"/></label></div>}
        {shape.kind==='custom'&&<label className="bg-field">Outline corners ({value.dimensions.unit}, x, y from the top-left)<textarea aria-label="Outline corners" rows={3} maxLength={20_000} value={shape.points??''} onChange={event=>onChange(setShape(value,{...shape,points:event.target.value}))} placeholder="0,0; 120,0; 120,150; 0,150"/></label>}
        {shapeIssue&&<p className="bg-error" role="alert">{shapeIssue}</p>}
        <div className="bg-section-label"><h3>Glass boundary</h3><span>02</span></div>
        <div className="bg-corner-list">{CORNER_KEYS.map(key=><span className={value.corners[key]?'selected':''} key={key}>{value.corners[key]?'✓':'○'} {key.toUpperCase()}</span>)}</div>
        <button className="bg-text-button" disabled={!value.image} onClick={()=>{onChange(setCorners(value,{}));setEditing(true);}}>Reset four corners</button>
        <div className="bg-section-label"><h3>Treatment specification</h3><span>03</span></div>
        <div className="bg-spec"><div className="bg-dot-symbol"/><div><strong>{guideline.dotDiameterMm} mm white dots</strong><span>{guideline.targetCenterPitchXmm} × {guideline.targetCenterPitchYmm} mm centre to centre</span></div></div>
        <p className="bg-help">Exterior application · continuous pattern across the pane.</p>
        <button className="bg-button bg-primary bg-generate" disabled={!inputResult.input||!!capacityIssue||busy||uploading||!calculateLayout} onClick={()=>void generate()}>{busy?'Calculating…':preview?'Regenerate preview':'Generate preview'} <span aria-hidden="true">↗</span></button>
        {capacityIssue&&<p className="bg-error" role="alert">{capacityIssue}</p>}
        {!inputResult.input&&<p className="bg-help">{inputResult.error}</p>}
        <p className="bg-help">Changing the measurements clears the old pattern. Generate again to update the preview and quantities.</p>
        {details}
      </aside>
    </div>
  </div>;
}
