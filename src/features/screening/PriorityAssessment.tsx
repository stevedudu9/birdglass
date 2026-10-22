import { Fragment, useRef, useState } from 'react';
import type { WindowDraft } from '../member2/types';
import { applyOverride, effectiveScreening, normaliseInputs } from './assessment';
import { FACTORS, PRIORITY_LABELS, SCREENING_CONFIG } from './config';
import type { Factor, Inputs, Priority } from './config';
import './screening.css';
import { ScreeningSummary } from './ScreeningSummary';
import type { ReviewTarget } from './summary';

export function PriorityAssessment({window:draft,onChange,legacyEntry}:{window:WindowDraft;onChange:(draft:WindowDraft)=>void;legacyEntry?:{priority?:'high'|'medium'|'low';priorityReason?:string}}) {
  const result=effectiveScreening(draft,legacyEntry),inputs=normaliseInputs(draft.screening);
  const [overrideLevel,setOverrideLevel]=useState<Priority>(result.effective);
  const [reason,setReason]=useState(''),[error,setError]=useState('');
  const controls=useRef<Partial<Record<ReviewTarget,HTMLElement|null>>>({});
  function review(target:ReviewTarget) {
    const control=target==='dimensions'?document.querySelector<HTMLElement>('[aria-label="Measured width"]'):controls.current[target];
    control?.focus({preventScroll:true});control?.scrollIntoView?.({behavior:'smooth',block:'center'});
  }
  function changeFactor(key:Factor,value:string) {
    onChange({...draft,screening:{...draft.screening,inputs:{...inputs,[key]:value} as Inputs}});
  }
  function note(key:'collisionEvidence'|'treatmentEvidence'|'notes',value:string) {
    onChange({...draft,screening:{...draft.screening,inputs,...{[key]:value}}});
  }
  return <section className="screening-panel" id="priority-assessment" aria-label="Window priority assessment">
    <header className="screening-heading"><div><span className="screening-kicker">Preliminary bird-collision hazard screening</span><h2>Which windows need attention?</h2><p>{draft.label || 'Selected window'} — record site observations to explain its priority.</p></div><span className="screening-policy-label">BirdGlass rules v{SCREENING_CONFIG.version}</span></header>
    <p className="screening-intro">Assess this pane as it exists today. A proposed dot preview is not an installed treatment. Unknown answers stay unknown.</p>
    <fieldset className="screening-fields"><legend>Window observations</legend>
      {(Object.keys(FACTORS) as Factor[]).map((key,index)=><Fragment key={key}><label className="screening-field"><span>{index>=4?index+2:index+1}. {FACTORS[key].label}</span><select ref={node=>{controls.current[key]=node;}} value={inputs[key]} onChange={event=>changeFactor(key,event.target.value)}>{FACTORS[key].options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{key==='vegetation'&&<div className="screening-area"><span>5. Untreated glass area · automatic</span><output>{result.untreatedAreaM2===null?'Not verified':`${Number(result.untreatedAreaM2.toFixed(4))} m²`}</output><small>{result.areaM2===null?'Enter valid glass dimensions to calculate area.':`Measured pane: ${Number(result.areaM2.toFixed(4))} m². `}{result.untreatedAreaM2===null&&result.potentialUntreatedAreaM2!==null?`Up to ${Number(result.potentialUntreatedAreaM2.toFixed(4))} m² may be untreated; coverage/suitability is unknown.`:inputs.treatment==='verified'?'Zero assumes the recorded verification covers the entire pane.':'The whole pane is untreated. No small-pane exemption is used.'}</small></div>}</Fragment>)}
    </fieldset>
    <div className="screening-notes">{inputs.collisions==='yes'&&<label>Collision observation / evidence reference<textarea ref={node=>{controls.current.collisionEvidence=node;}} rows={2} maxLength={1000} placeholder="Date, location, observer and record or photo reference" value={draft.screening?.collisionEvidence??''} onChange={event=>note('collisionEvidence',event.target.value)}/></label>}
      {inputs.treatment==='verified'&&<label>Whole-pane treatment verification record<textarea ref={node=>{controls.current.treatmentEvidence=node;}} rows={2} maxLength={1000} placeholder="Product, exterior coverage, inspection date and verifier/reference" value={draft.screening?.treatmentEvidence??''} onChange={event=>note('treatmentEvidence',event.target.value)}/><small>Record why the existing treatment is suitable across the entire pane. BirdGlass does not independently certify this claim.</small></label>}
      <label>Site notes (optional)<textarea ref={node=>{controls.current.notes=node;}} rows={2} maxLength={1000} placeholder="Observation date, vegetation/lighting context, or details of an Other architectural feature" value={draft.screening?.notes??''} onChange={event=>note('notes',event.target.value)}/></label>
    </div>
    <ScreeningSummary draft={draft} result={result} onReview={review}/>
    <details className="screening-override"><summary>Override the recommendation</summary><p>Keep the rule result visible and record why your team chooses a different priority. An override expires when observations, dimensions or rules change.</p><div className="screening-override-fields"><label>Override priority<select value={overrideLevel} onChange={event=>setOverrideLevel(event.target.value as Priority)}>{Object.entries(PRIORITY_LABELS).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><label>Override reason (required)<textarea rows={2} maxLength={300} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Explain the site evidence behind your decision"/></label></div>{error&&<p className="screening-error" role="alert">{error}</p>}<div className="screening-actions"><button type="button" className="app-button" onClick={()=>{try{onChange(applyOverride(draft,overrideLevel,reason));setError('');setReason('');}catch(e){setError((e as Error).message);}}}>Apply priority override</button>{draft.screening?.override&&<button type="button" onClick={()=>{onChange({...draft,screening:{...draft.screening!,override:undefined}});setError('');}}>Use rule recommendation</button>}</div>{result.legacyOverride&&<p>Earlier manual priority retained with its recorded reason. Review the observations and apply a new override to replace that legacy decision.</p>}
      {!!draft.screening?.overrideHistory?.length&&<details><summary>Recorded overrides ({draft.screening.overrideHistory.length})</summary><ul>{draft.screening.overrideHistory.map((item,index)=><li key={index}>{PRIORITY_LABELS[item.level]} — {item.reason} ({item.recordedAt})</li>)}</ul></details>}
    </details>
  </section>;
}


