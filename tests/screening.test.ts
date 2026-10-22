import { expect, it } from 'vitest';
import { applyOverride, effectiveScreening, isScreeningRecord, normaliseInputs, screenWindow } from '../src/features/screening/assessment';
import { SCREENING_CONFIG } from '../src/features/screening/config';
import type { Inputs } from '../src/features/screening/config';
import { createWindow } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { screeningReport } from '../src/features/screening/report';

const complete:Inputs={collisions:'none',reflections:'minimal',transparency:'no',vegetation:'none',canopy:'above',architecture:'standard',attractants:'no',lighting:'low',treatment:'none'};
function pane(inputs:Partial<Inputs>=complete):WindowDraft {return {...createWindow('Pane A'),dimensions:{width:'120',height:'150',unit:'cm'},screening:{inputs:{...inputs}}};}

it('keeps old windows with no observations as Needs Review, not zero risk',()=>{
  const draft=pane();delete draft.screening;
  const result=screenWindow(draft);expect(result.recommended).toBe('review');expect(result.unknowns).toHaveLength(9);
  expect(result.untreatedAreaM2).toBeNull();expect(result.potentialUntreatedAreaM2).toBe(1.8);
});
it('calculates glass area from supported units and recalculates when measurements change',()=>{
  expect(screenWindow(pane()).untreatedAreaM2).toBe(1.8);
  const draft=pane();draft.dimensions={width:'1.5',height:'1.8',unit:'m'};
  expect(screenWindow(draft).areaM2).toBe(2.7);
});
it('requires a valid area before giving Lower, without erasing a known collision flag',()=>{
  const draft=pane();draft.dimensions.width='';
  expect(screenWindow(draft).recommended).toBe('review');expect(screenWindow(draft).unknowns).toContain('Measured glass area');
  draft.screening!.inputs.collisions='yes';expect(screenWindow(draft).recommended).toBe('high');
});
it('reports Lower only after complete lower-concern observations, never as safety certification',()=>{
  const result=screenWindow(pane());expect(result.recommended).toBe('lower');
  expect(result.warnings.join(' ')).toContain('not evidence');expect(result.reasons.some(r=>r.id==='L-OBSERVED')).toBe(true);
});
it('treats every single unknown observation as incomplete rather than low concern',()=>{
  for(const key of Object.keys(complete) as (keyof Inputs)[]) {
    const result=screenWindow(pane({...complete,[key]:'unknown'}));
    expect(result.recommended,key).toBe('review');expect(result.reviewRequired,key).toBe(true);
  }
});
it('prioritises reported collisions over a verified treatment claim and asks for evidence',()=>{
  const result=screenWindow(pane({...complete,collisions:'yes',treatment:'verified'}));
  expect(result.recommended).toBe('high');expect(result.reasons[0].id).toBe('H-COLLISION');
  expect(result.warnings.join(' ')).toMatch(/reconciliation/);expect(result.warnings.join(' ')).toMatch(/observation, date/);
  expect(result.unknowns).toContain('Treatment verification record for the whole pane');
});
it('does not turn unverified treatment into zero untreated area or erase known indicators',()=>{
  const result=screenWindow(pane({...complete,treatment:'unverified',reflections:'strong'}));
  expect(result.recommended).toBe('medium');expect(result.untreatedAreaM2).toBeNull();expect(result.potentialUntreatedAreaM2).toBe(1.8);
  expect(result.unknowns).toContain('Existing treatment suitability and coverage');
});
it('requires whole-pane verification evidence before suppressing glass indicators',()=>{
  const draft=pane({...complete,treatment:'verified',reflections:'strong',vegetation:'close'});
  expect(screenWindow(draft).recommended).toBe('high');
  expect(screenWindow(draft).unknowns).toContain('Treatment verification record for the whole pane');
  draft.screening!.treatmentEvidence='Exterior product verified over whole pane; inspection record A, 2026-10-16.';
  expect(screenWindow(draft).recommended).toBe('lower');expect(screenWindow(draft).untreatedAreaM2).toBe(0);
  draft.screening!.inputs.lighting='high';expect(screenWindow(draft).recommended).toBe('medium');
  draft.screening!.inputs.collisions='yes';expect(screenWindow(draft).recommended).toBe('high');
});
it('explains hazard combinations and retains remaining unknowns with High or Medium',()=>{
  const high=screenWindow(pane({reflections:'strong',vegetation:'close',treatment:'none'}));
  expect(high.recommended).toBe('high');expect(high.unknowns).toContain('Documented past collisions');expect(high.reasons.some(r=>r.id==='H-REFLECT-VEG')).toBe(true);
  expect(screenWindow(pane({transparency:'yes',architecture:'parallel'})).recommended).toBe('high');
  const medium=screenWindow(pane({lighting:'moderate'}));expect(medium.recommended).toBe('medium');expect(medium.unknowns.length).toBeGreaterThan(0);
});
it('does not declare Other architecture resolved or exempt small panes or glass above canopy',()=>{
  expect(screenWindow(pane({...complete,architecture:'other'})).recommended).toBe('review');
  const draft=pane({...complete,transparency:'yes'});draft.dimensions={width:'20',height:'20',unit:'mm'};
  expect(screenWindow(draft).recommended).toBe('medium');expect(screenWindow(draft).areaM2).toBe(.0004);
});
it('supports versioned policy calibration without a default invented area cutoff',()=>{
  expect(SCREENING_CONFIG.largeUntreatedAreaM2).toBeNull();expect(screenWindow(pane()).recommended).toBe('lower');
  const calibrated=screenWindow(pane(),{...SCREENING_CONFIG,version:'test',largeUntreatedAreaM2:1});
  expect(calibrated.recommended).toBe('medium');expect(calibrated.reasons.some(r=>r.id==='M-AREA-POLICY')).toBe(true);
  const rules=SCREENING_CONFIG.rules.filter(r=>r.level!=='high');
  expect(screenWindow(pane({...complete,reflections:'strong',vegetation:'close'}),{...SCREENING_CONFIG,rules}).recommended).toBe('medium');
});
it('rejects empty/invalid override reasons and records a timestamp, context and history',()=>{
  const draft=pane({...complete,collisions:'yes'});
  expect(()=>applyOverride(draft,'lower','   ')).toThrow(/reason/);expect(()=>applyOverride(draft,'medium','a'.repeat(301))).toThrow();
  const updated=applyOverride(draft,'medium','Collision predates a documented site change.','2026-10-16T12:00:00.000Z');
  const result=screenWindow(updated);expect(result.recommended).toBe('high');expect(result.effective).toBe('medium');
  expect(result.reasons.some(r=>r.id==='H-COLLISION')).toBe(true);expect(updated.screening!.overrideHistory).toHaveLength(1);
  expect(result.override?.recordedAt).toBe('2026-10-16T12:00:00.000Z');expect(isScreeningRecord(updated.screening)).toBe(true);
});
it('expires overrides after an observation, measurement or configured rule change',()=>{
  const draft=applyOverride(pane(),'high','Site inspection pending.');
  const measured={...draft,dimensions:{...draft.dimensions,width:'121'}};
  expect(screenWindow(measured).overrideStale).toBe(true);expect(screenWindow(measured).effective).toBe('lower');
  const observed={...draft,screening:{...draft.screening!,inputs:{...complete,collisions:'yes' as const}}};
  expect(screenWindow(observed).overrideStale).toBe(true);expect(screenWindow(observed).effective).toBe('high');
  expect(screenWindow(draft,{...SCREENING_CONFIG,version:'2'}).overrideStale).toBe(true);
  expect(screenWindow({...draft,photoRevision:draft.photoRevision+1}).overrideStale).toBe(true);
});
it('preserves unknown follow-up even when a user overrides Needs Review to Lower',()=>{
  const result=screenWindow(applyOverride(pane({}),'lower','A separate site assessment is referenced in file B.'));
  expect(result.effective).toBe('lower');expect(result.recommended).toBe('review');expect(result.unknowns).toHaveLength(9);
});
it('validates stored inputs and prevents silent malformed override adoption',()=>{
  expect(isScreeningRecord({inputs:{reflections:'zero-risk'}})).toBe(false);
  expect(isScreeningRecord({inputs:{},override:{level:'high',reason:''}})).toBe(false);
  expect(isScreeningRecord({inputs:{},notes:'x'.repeat(1001)})).toBe(false);
  expect(isScreeningRecord({inputs:{}})).toBe(true);
  expect(normaliseInputs()).toMatchObject({collisions:'unknown',lighting:'unknown'});
});
it('preserves earlier manual priorities only as labelled overrides with a recorded reason',()=>{
  const draft=pane();delete draft.screening;
  expect(effectiveScreening(draft,{priority:'high'}).effective).toBe('review');
  const result=effectiveScreening(draft,{priority:'low',priorityReason:'Legacy inspection note'});
  expect(result.effective).toBe('lower');expect(result.recommended).toBe('review');expect(result.legacyOverride).toBeTruthy();
});
it('escapes evidence and override text in a portable screening summary',()=>{
  const draft=applyOverride(pane({...complete,collisions:'yes'}),'medium','<script>alert(1)</script>');
  draft.screening!.collisionEvidence='<img src=x onerror=alert(1)>';
  const html=screeningReport(draft);
  expect(html).not.toContain('<img src=x');expect(html).toContain('&lt;img');expect(html).not.toContain('<script>');
  expect(html).toContain('Unknown inputs');expect(html).toContain('USFWS');expect(html).toContain('H-COLLISION');
});


it('does not let an unsupported verified-treatment claim suppress strong known hazards',()=>{
 const draft=pane({reflections:'strong',vegetation:'close',treatment:'verified'});
 const result=screenWindow(draft);expect(result.recommended).toBe('high');
 expect(result.unknowns).toContain('Treatment verification record for the whole pane');
 expect(result.unknowns).toContain('Nighttime lighting');
 expect(result.reasons.some(reason=>reason.id==='H-REFLECT-VEG')).toBe(true);
});
it('retains a known single hazard with incomplete verification instead of forcing Needs Review',()=>{
 expect(screenWindow(pane({reflections:'strong',treatment:'verified'})).recommended).toBe('medium');
 expect(screenWindow(pane({treatment:'verified'})).recommended).toBe('review');
});
