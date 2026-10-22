import { expect,it } from 'vitest';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { makeReferenceLayout } from '../src/demo/referenceLayout';
const request={windowId:'one',dimensionRevision:1,widthMm:1234,heightMm:1578,guidelineId:BASELINE_GUIDELINE.id,guidelineVersion:BASELINE_GUIDELINE.version};
it('locks 10 mm white circles and 50 mm centre pitch, with 40 mm clear gaps',()=>{
  expect(BASELINE_GUIDELINE.markerColor).toBe('white'); expect(BASELINE_GUIDELINE.dotDiameterMm).toBe(10);
  const layout=makeReferenceLayout(request,BASELINE_GUIDELINE);
  expect(layout.actualCenterPitchXmm).toBe(50);expect(layout.actualCenterPitchYmm).toBe(50);
  expect(layout.dotsMm[1].xMm-layout.dotsMm[0].xMm-layout.dotDiameterMm).toBe(40);
  expect(layout.dotsMm.every(p=>p.xMm>=5&&p.yMm>=5&&p.xMm<=1229&&p.yMm<=1573)).toBe(true);
});
it('keeps pitch fixed when glass dimensions are not multiples of 50',()=>{
  const a=makeReferenceLayout(request,BASELINE_GUIDELINE),b=makeReferenceLayout({...request,widthMm:1249},BASELINE_GUIDELINE);
  expect(a.actualCenterPitchXmm).toBe(b.actualCenterPitchXmm);expect(a.dotsMm[0].xMm).not.toBe(b.dotsMm[0].xMm);
});
it('supports a single row/column and refuses smaller-than-dot glass',()=>{
  const layout=makeReferenceLayout({...request,widthMm:10,heightMm:10},BASELINE_GUIDELINE);
  expect(layout.dotsMm).toEqual([{id:'r1c1',xMm:5,yMm:5}]);expect(layout.actualCenterPitchXmm).toBeNull();
  expect(()=>makeReferenceLayout({...request,widthMm:9},BASELINE_GUIDELINE)).toThrow();
});
