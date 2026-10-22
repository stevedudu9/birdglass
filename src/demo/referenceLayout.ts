import { LIMITS } from '../features/member2/model';
import type { GuidelineProfile, LayoutRequest, LayoutResult } from '../features/member2/types';

/** Replaceable prototype adapter. Fixed pitch, equal margins, no clipped or resized dots. */
export function makeReferenceLayout(request:LayoutRequest,guideline:GuidelineProfile):LayoutResult {
  const {widthMm,heightMm}=request, d=guideline.dotDiameterMm, px=guideline.targetCenterPitchXmm, py=guideline.targetCenterPitchYmm;
  if (![widthMm,heightMm,d,px,py].every(v=>Number.isFinite(v)&&v>0)) throw new Error('Dimensions, diameter and pitch must be positive.');
  if (px<d || py<d) throw new Error('The configured dots would overlap.');
  if (widthMm<d || heightMm<d) throw new Error(`The glass must be at least ${d} mm wide and high to fit a complete dot.`);
  const columns=Math.floor((widthMm-d)/px)+1,rows=Math.floor((heightMm-d)/py)+1;
  if (rows*columns>LIMITS.dots) throw new Error(`This layout exceeds the ${LIMITS.dots.toLocaleString('en-MY')}-dot preview limit. Check the measured glass size and units.`);
  const startX=(widthMm-(columns-1)*px)/2,startY=(heightMm-(rows-1)*py)/2;
  return {windowId:request.windowId,dimensionRevision:request.dimensionRevision,guidelineId:request.guidelineId,guidelineVersion:request.guidelineVersion,
    layoutVersion:crypto.randomUUID(),algorithmVersion:'member2-reference-grid-1',rows,columns,dotCount:rows*columns,
    dotDiameterMm:d,actualCenterPitchXmm:columns===1?null:px,actualCenterPitchYmm:rows===1?null:py,
    dotsMm:Array.from({length:rows*columns},(_,i)=>({id:`r${Math.floor(i/columns)+1}c${i%columns+1}`,xMm:startX+(i%columns)*px,yMm:startY+Math.floor(i/columns)*py})),
    validation:{status:'incomplete',issues:['Prototype layout provider; team algorithm integration and boundary-rule review are pending.']}};
}
