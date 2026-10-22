import { expect,it } from 'vitest';
import { createHandoff } from '../src/features/member2/export';
import { buildLayoutRequest,createWindow,setCorners,setDimensions } from '../src/features/member2/model';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { makeReferenceLayout } from '../src/demo/referenceLayout';
import type { WindowDraft } from '../src/features/member2/types';
function ready(){
  const draft:WindowDraft={...createWindow('Export test'),image:{imageId:'a',name:'photo',dataUrl:'data:image/png;base64,AAAA',widthPx:1200,heightPx:900,orientationNormalized:true,kind:'photo'},
    corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}},dimensions:{width:'100',height:'100',unit:'cm'}};
  draft.layout=makeReferenceLayout(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
}
it('exports consistent IDs, revisions, original units, image bytes and projected outlines',()=>{
  const draft=ready(),handoff=JSON.parse(JSON.stringify(createHandoff(draft,BASELINE_GUIDELINE)));
  expect(handoff.input.windowId).toBe(handoff.preview.windowId);expect(handoff.layout.layoutVersion).toBe(handoff.preview.layoutVersion);
  expect(handoff.preview.projectedDots).toHaveLength(handoff.layout.dotCount);expect(handoff.originalDimensions.unit).toBe('cm');
  expect(handoff.imageAsset.dataUrl).toContain('base64');expect(handoff.validation.status).toBe('incomplete');
  expect(handoff.previewNotice).toContain('not a scale installation template');
});
it('reprojects a new corner revision without changing the exported physical layout',()=>{
  const draft=ready(),a=createHandoff(draft,BASELINE_GUIDELINE),b=createHandoff(setCorners(draft,{...draft.corners,tl:{u:.2,v:.2}}),BASELINE_GUIDELINE);
  expect(a.layout.layoutVersion).toBe(b.layout.layoutVersion);expect(b.preview.photoRevision).toBe(a.preview.photoRevision+1);
  expect(a.preview.projectedDots[0].centerNorm).not.toEqual(b.preview.projectedDots[0].centerNorm);
});
it('refuses to export stale layouts after dimension changes',()=>{
  const draft=ready(),changed=setDimensions(draft,{width:'110',height:'100',unit:'cm'});
  expect(()=>createHandoff(changed,BASELINE_GUIDELINE)).toThrow();
  expect(()=>createHandoff({...changed,layout:draft.layout},BASELINE_GUIDELINE)).toThrow('outdated');
});
