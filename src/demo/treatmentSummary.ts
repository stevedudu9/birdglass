import { BASELINE_GUIDELINE } from '../config/baseline';
import { buildLayoutRequest, buildWindowInput, readDimensions } from '../features/member2/model';
import { validateLayout } from '../features/member2/validation';
import type { GuidelineProfile, WindowDraft } from '../features/member2/types';
import { calculateQuantities, validatePattern } from '../features/member3';
import type { Treatment } from './planning';

/** Public presentation model. Reuse both validators and the quantity engine;
 * never accept saved count/status metadata as evidence of a valid layout. */
export function treatmentSummary(window:WindowDraft,guideline:GuidelineProfile=BASELINE_GUIDELINE) {
  let dimensions:ReturnType<typeof readDimensions>|null=null;
  try {dimensions=readDimensions(window.dimensions);} catch { /* Inputs are not ready. */ }
  const empty={dimensions,treatment:null as Treatment|null,status:'unknown' as 'unknown'|'pass'|'incomplete'|'fail',issues:[] as string[],pending:[] as string[]};
  if(!window.layout)return {...empty,pending:['Generate the pattern after selecting the glass corners and entering its dimensions.']};
  try {
    const input=buildWindowInput(window),request=buildLayoutRequest(window,guideline);
    const physical=validatePattern(window.layout,request,guideline),adapter=validateLayout(window.layout,input,guideline);
    const issues=[...new Set([...physical.issues,...adapter.issues])],pending=[...new Set([...physical.pending,...adapter.pending])];
    const status=issues.length?'fail':pending.length?'incomplete':'pass';
    if(!physical.geometryPassed||!adapter.geometryPassed)return {...empty,status:'fail' as const,issues,pending};
    const check={...physical,status:status as 'pass'|'incomplete',issues,pending};
    const treatment:Treatment={draft:window,request,check,quantities:calculateQuantities(request,window.layout,guideline)};
    return {dimensions,treatment,status:check.status,issues,pending};
  }catch(error){return {...empty,status:'incomplete' as const,pending:[(error as Error).message]};}
}
