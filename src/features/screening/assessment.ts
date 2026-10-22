import { FACTORS, PRIORITY_LABELS, SCREENING_CONFIG } from './config';
import type { Factor, Inputs, Priority, ScreeningConfig } from './config';
import { glassAreaMm2, readDimensions } from '../member2/model';
import type { WindowDraft } from '../member2/types';

export type PriorityOverride = {level:Priority;reason:string;recordedAt:string;context:string};
export type ScreeningRecord = {inputs:Partial<Inputs>;collisionEvidence?:string;treatmentEvidence?:string;notes?:string;override?:PriorityOverride;overrideHistory?:PriorityOverride[]};
export type Reason = {id:string;text:string;sources:readonly string[]};
export type ScreeningResult = {recommended:Priority;effective:Priority;reasons:Reason[];unknowns:string[];warnings:string[];areaM2:number|null;untreatedAreaM2:number|null;potentialUntreatedAreaM2:number|null;reviewRequired:boolean;override:PriorityOverride|null;overrideStale:boolean;context:string;configId:string;configVersion:string};
const fields=Object.keys(FACTORS) as Factor[];
export function normaliseInputs(record?:ScreeningRecord):Inputs {
  return Object.fromEntries(fields.map(key=>[key,FACTORS[key].options.some(option=>option[0]===record?.inputs?.[key])?record!.inputs[key]:'unknown'])) as Inputs;
}
export function screenWindow(draft:Pick<WindowDraft,'dimensions'|'screening'>&Partial<Pick<WindowDraft,'photoRevision'>>, config:ScreeningConfig=SCREENING_CONFIG):ScreeningResult {
  const record=draft.screening,inputs=normaliseInputs(record),reasons:Reason[]=[],warnings:string[]=[];
  const unknowns:string[]=fields.filter(key=>inputs[key]==='unknown').map(key=>FACTORS[key].label);
  let areaM2:number|null=null;
  try { const dimensions=readDimensions(draft.dimensions);areaM2=dimensions.widthMm*dimensions.heightMm/1_000_000;try{areaM2=glassAreaMm2(draft)/1_000_000;}catch{/* Shape incomplete: keep the bounding area. */} } catch {unknowns.push('Measured glass area');}
  const treatmentVerified=inputs.treatment==='verified'&&!!record?.treatmentEvidence?.trim();
  const untreatedAreaM2=inputs.treatment==='none'?areaM2:treatmentVerified?0:null;
  const potentialUntreatedAreaM2=treatmentVerified?0:areaM2;
  const context=JSON.stringify({config,inputs,dimensions:draft.dimensions,photoRevision:draft.photoRevision??null,collisionEvidence:record?.collisionEvidence??'',treatmentEvidence:record?.treatmentEvidence??'',notes:record?.notes??''});
  if(inputs.collisions==='none') warnings.push('None reported is not evidence that collisions have never occurred.');
  if(inputs.collisions==='yes'&&!record?.collisionEvidence?.trim()) warnings.push('Record the collision observation, date and evidence reference. High attention remains warranted while evidence details are pending.');
  if(inputs.architecture==='other') unknowns.push('Other architectural feature: site review needed');
  if(inputs.treatment==='unverified') unknowns.push('Existing treatment suitability and coverage');
  if(inputs.treatment==='verified'&&!treatmentVerified) unknowns.push('Treatment verification record for the whole pane');
  if(unknowns.length) warnings.push('Unknown or unverified inputs require follow-up; they are not evidence of low hazard.');
  let recommended:Priority='review';
  if(inputs.collisions==='yes') {
    recommended='high';reasons.push({id:'H-COLLISION',text:'Documented past collisions are reported at this window; investigate and prioritise a response.',sources:['fws','nparks']});
    if(inputs.treatment==='verified') warnings.push('Reported collisions and a verified-treatment claim need reconciliation: check dates, coverage, condition and installation. The collision flag takes precedence.');
  } else {
    // Missing treatment evidence is follow-up, not a reason to skip known hazards.
    if(inputs.treatment==='verified'&&!treatmentVerified) reasons.push({id:'R-VERIFICATION',text:'A verified-treatment claim needs a recorded product/inspection reference and whole-pane coverage confirmation.',sources:['fws','nparks']});
    // Verified treatment addresses the assessed glass, not nighttime lighting.
    const matches=config.rules.filter(rule=>(!treatmentVerified||rule.when.lighting!==undefined)&&Object.entries(rule.when).every(([key,values])=>values!.includes(inputs[key as Factor])));
    reasons.push(...matches.map(rule=>({id:rule.id,text:rule.reason,sources:rule.sources})));
    if(config.largeUntreatedAreaM2!==null&&Number.isFinite(config.largeUntreatedAreaM2)&&config.largeUntreatedAreaM2>0&&potentialUntreatedAreaM2!==null&&potentialUntreatedAreaM2>=config.largeUntreatedAreaM2) reasons.push({id:'M-AREA-POLICY',text:`Potential untreated area meets the configured BirdGlass review threshold (${config.largeUntreatedAreaM2} m²); this is project policy.`,sources:['abc']});
    if(matches.some(rule=>rule.level==='high')) recommended='high';
    else if(matches.length||reasons.some(reason=>reason.id==='M-AREA-POLICY')) recommended='medium';
    else if(unknowns.length===0) recommended='lower';
    if(treatmentVerified) reasons.push({id:'T-VERIFIED',text:'The user records a suitable treatment verified across this entire pane; retain the verification reference and monitor its condition.',sources:['fws','nparks']});
    if(recommended==='lower') reasons.push({id:'L-OBSERVED',text:'No escalation rule matched the completed observations. Lower is relative screening attention, not proof of safety.',sources:[]});
    if(recommended==='review') reasons.push({id:'R-MISSING',text:'Complete the unknown or unverified observations before assigning a lower screening priority.',sources:[]});
  }
  if(areaM2!==null) reasons.push({id:'AREA-CONTEXT',text:`Glass area is ${Number(areaM2.toFixed(4))} m². No default area cutoff or small-pane exemption is applied.`,sources:['abc']});
  const override=record?.override;
  const validOverride=!!override&&isOverride(override)&&override.context===context;
  const overrideStale=!!override&&!validOverride;
  if(overrideStale) warnings.push('The saved override no longer matches these inputs or rules. The recommendation applies until the override is reviewed.');
  return {recommended,effective:validOverride?override!.level:recommended,reasons,unknowns,warnings,areaM2,untreatedAreaM2,potentialUntreatedAreaM2,
    reviewRequired:unknowns.length>0||inputs.collisions==='yes'||overrideStale,override:validOverride?override!:null,overrideStale,context,configId:config.id,configVersion:config.version};
}
function isOverride(value:unknown):value is PriorityOverride {
  if(!value||typeof value!=='object')return false;const v=value as PriorityOverride;
  return Object.keys(PRIORITY_LABELS).includes(v.level)&&typeof v.reason==='string'&&!!v.reason.trim()&&v.reason.length<=300&&typeof v.recordedAt==='string'&&v.recordedAt.length<=40&&Number.isFinite(Date.parse(v.recordedAt))&&typeof v.context==='string'&&v.context.length<=20000;
}
export function isScreeningRecord(value:unknown):value is ScreeningRecord {
  if(!value||typeof value!=='object'||Array.isArray(value))return false;const v=value as ScreeningRecord;
  if(!v.inputs||typeof v.inputs!=='object'||Array.isArray(v.inputs))return false;
  if(!Object.entries(v.inputs).every(([key,entry])=>fields.includes(key as Factor)&&FACTORS[key as Factor].options.some(option=>option[0]===entry)))return false;
  if(!['collisionEvidence','treatmentEvidence','notes'].every(key=>{const entry=v[key as keyof ScreeningRecord];return entry===undefined||(typeof entry==='string'&&entry.length<=1000);}))return false;
  return (v.override===undefined||isOverride(v.override))&&(v.overrideHistory===undefined||(Array.isArray(v.overrideHistory)&&v.overrideHistory.length<=20&&v.overrideHistory.every(isOverride)));
}
export function applyOverride(draft:WindowDraft,level:Priority,reason:string,recordedAt=new Date().toISOString()):WindowDraft {
  const result=screenWindow(draft),override={level,reason:reason.trim(),recordedAt,context:result.context};
  if(!isOverride(override)) throw new Error('Choose a priority and record a reason of 1–300 characters.');
  const record=draft.screening??{inputs:{}};
  return {...draft,screening:{...record,override,overrideHistory:[...(record.overrideHistory??[]),override].slice(-20)}};
}
/** Existing manually assigned plan priorities survive as explicitly labelled
 * legacy overrides only when a reason was recorded. They do not supply inputs. */
export function effectiveScreening(draft:WindowDraft,entry?:{priority?:'high'|'medium'|'low';priorityReason?:string}) {
  const result=screenWindow(draft);
  const legacy=!draft.screening&&entry?.priority&&entry.priorityReason?.trim()?entry:null;
  if(!draft.screening&&entry?.priority&&!entry.priorityReason?.trim()) result.warnings.push('An earlier manual priority has no recorded reason and is not applied. Review observations or record a new override.');
  return {...result,effective:legacy?(legacy.priority==='low'?'lower':legacy.priority!) as Priority:result.effective,legacyOverride:legacy};
}
