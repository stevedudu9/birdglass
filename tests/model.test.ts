import { describe, expect, it } from 'vitest';
import { acceptLayout, buildLayoutRequest, buildWindowInput, createWindow, readDimensions, setCorners, setDimensions, setImage } from '../src/features/member2/model';
import { makeReferenceLayout } from '../src/demo/referenceLayout';
import { BASELINE_GUIDELINE as DEMO_GUIDELINE } from '../src/config/baseline';
import { parseLayout, validateLayout } from '../src/features/member2/validation';
import type { WindowDraft } from '../src/features/member2/types';
const makeFixture = (request: Parameters<typeof makeReferenceLayout>[0]) => makeReferenceLayout(request, DEMO_GUIDELINE);

function ready(): WindowDraft {
  return {...createWindow('Window 1'), image:{imageId:'photo',name:'sample',dataUrl:'data:image/png;base64,a',widthPx:1000,heightPx:1000,orientationNormalized:true,kind:'illustration'},
    dimensions:{width:'120',height:'150',unit:'cm'}, corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
}
describe('dimensions and state', () => {
  it('normalizes cm, mm and metres equivalently',()=>{
    const a=readDimensions({width:'100',height:'200',unit:'cm'});
    expect(a).toEqual(readDimensions({width:'1000',height:'2000',unit:'mm'}));
    expect(a).toEqual(readDimensions({width:'1',height:'2',unit:'m'}));
  });
  it.each(['',' ','0','-1','NaN','Infinity','1e999','abc'])('rejects invalid dimension %s',width=>expect(()=>readDimensions({width,height:'100',unit:'mm'})).toThrow());
  it('drops a late result after dimensions change',()=>{
    const draft=ready(), request=buildLayoutRequest(draft,DEMO_GUIDELINE), layout=makeFixture(request);
    const changed=setDimensions(draft,{width:'130',height:'150',unit:'cm'});
    expect(acceptLayout(changed,request,layout,DEMO_GUIDELINE)).toBe(changed);
  });
  it('does not apply another window’s result',()=>{
    const a=ready(), b=ready(), request=buildLayoutRequest(a,DEMO_GUIDELINE);
    expect(acceptLayout(b,request,makeFixture(request),DEMO_GUIDELINE)).toBe(b);
  });
  it('keeps physical layout on corner edits but clears it on photo replacement',()=>{
    const draft=ready(); draft.layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    const edited=setCorners(draft,{...draft.corners,tl:{u:.15,v:.15}});
    expect(edited.layout).toBe(draft.layout); expect(edited.photoRevision).toBe(draft.photoRevision+1);
    const replaced=setImage(edited,{...draft.image!,imageId:'new'});
    expect(replaced.layout).toBeNull(); expect(replaced.corners).toEqual({});
  });
});
describe('algorithm boundary and independent validation',()=>{
  it('rejects invalid physical input even when validation is called outside the editor',()=>{
    const draft=ready(),layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    expect(validateLayout(layout,{...buildWindowInput(draft),widthMm:NaN},DEMO_GUIDELINE).status).toBe('fail');
  });
  it('refuses image assets without a normalized coordinate basis',()=>{
    const draft=ready();draft.image={...draft.image!,widthPx:NaN};
    expect(()=>buildWindowInput(draft)).toThrow('orientation-normalized');
  });
  it('keeps a development fixture incomplete even when its geometry is valid',()=>{
    const draft=ready(), layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    const check=validateLayout(layout,buildWindowInput(draft),DEMO_GUIDELINE);
    expect(check.geometryPassed).toBe(true); expect(check.status).toBe('incomplete');
  });
  it('rejects forged valid:true-style claims when a circle crosses a boundary',()=>{
    const draft=ready(), layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    layout.validation={status:'pass',issues:[]}; layout.dotsMm[0].xMm=0;
    expect(validateLayout(layout,buildWindowInput(draft),DEMO_GUIDELINE).status).toBe('fail');
  });
  it('rejects duplicate IDs and count mismatch',()=>{
    const draft=ready(), layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    layout.dotsMm[1].id=layout.dotsMm[0].id;
    expect(()=>parseLayout(layout)).toThrow('unique');
    layout.dotCount++;
    expect(()=>parseLayout(layout)).toThrow('dotCount');
  });
  it('rejects irregular pitch and duplicate positions',()=>{
    const draft=ready(), layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    layout.dotsMm[1]={...layout.dotsMm[0],id:'distinct'};
    expect(validateLayout(layout,buildWindowInput(draft),DEMO_GUIDELINE).status).toBe('fail');
  });
  it('checks maximum centre pitch and edge gaps independently',()=>{
    const draft=ready(), layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    const check=validateLayout(layout,buildWindowInput(draft),{...DEMO_GUIDELINE,maxCenterPitchXmm:40,maxBoundaryClearGapMm:1});
    expect(check.issues.join(' ')).toContain('centre pitch'); expect(check.issues.join(' ')).toContain('Boundary gap');
  });
  it('supports a single dot with null pitches',()=>{
    const draft={...ready(),dimensions:{width:'20',height:'20',unit:'mm' as const}};
    const layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    expect(layout.dotCount).toBe(1); expect(layout.actualCenterPitchXmm).toBeNull();
    expect(validateLayout(layout,buildWindowInput(draft),DEMO_GUIDELINE).geometryPassed).toBe(true);
  });
  it('rejects too many dots before allocating the array',()=>{
    const draft={...ready(),dimensions:{width:'100000',height:'100000',unit:'mm' as const}};
    expect(()=>makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE))).toThrow('10,000');
  });
  it('rejects guideline and revision mismatches',()=>{
    const draft=ready(), layout=makeFixture(buildLayoutRequest(draft,DEMO_GUIDELINE));
    layout.dimensionRevision=99; layout.guidelineVersion='wrong';
    expect(validateLayout(layout,buildWindowInput(draft),DEMO_GUIDELINE).issues.length).toBeGreaterThanOrEqual(2);
  });
});
