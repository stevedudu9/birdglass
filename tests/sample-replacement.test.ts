import { expect, it } from 'vitest';
import { createWindow, buildLayoutRequest } from '../src/features/member2/model';
import { validateCorners } from '../src/features/member2/geometry';
import { generatePattern } from '../src/features/member3';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { emptyPlan, inspectEntry, planEntry } from '../src/demo/planning';
import { isLegacySample, replaceLegacySamples, SAMPLE_CORNERS, SAMPLE_IMAGE_NAME, upgradeLegacySamples } from '../src/demo/sample';
import type { ImageAsset, WindowDraft } from '../src/features/member2/types';

const supplied:ImageAsset={imageId:'birdglass-window-example-v2',name:SAMPLE_IMAGE_NAME,dataUrl:'data:image/png;base64,AAAA',widthPx:1448,heightPx:1086,orientationNormalized:true,kind:'illustration'};
function legacy():WindowDraft {
  const draft:WindowDraft={...createWindow('Renamed pane'),image:{...supplied,imageId:'old',name:'Illustrated sample window',widthPx:1280,heightPx:900},
    corners:{tl:{u:.2,v:.2},tr:{u:.8,v:.2},br:{u:.8,v:.8},bl:{u:.2,v:.8}},
    dimensions:{width:'150',height:'180',unit:'cm'},photoRevision:4,dimensionRevision:7};
  draft.layout=generatePattern(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
}

it('selects a valid glass boundary inside the supplied image frame',()=>{
  expect(validateCorners(SAMPLE_CORNERS)).toEqual([]);
  expect(SAMPLE_CORNERS.tl.u*supplied.widthPx).toBe(384);
});
it('updates every saved built-in example without changing measurements, layout or plan references',()=>{
  const first=legacy(),second={...legacy(),label:'Another pane'};
  const plan={...emptyPlan(),entries:[{...planEntry(first),priority:'high' as const,priorityReason:'Team observation'}]};
  const [updated,other]=replaceLegacySamples([first,second],supplied);
  expect(updated.image).toBe(supplied);expect(other.image).toBe(supplied);
  expect(updated.corners).toEqual(SAMPLE_CORNERS);expect(updated.corners).not.toBe(SAMPLE_CORNERS);
  expect(updated.photoRevision).toBe(5);expect(updated.dimensionRevision).toBe(7);
  expect(updated.dimensions).toBe(first.dimensions);expect(updated.layout).toBe(first.layout);
  expect(updated.windowId).toBe(first.windowId);expect(updated.label).toBe(first.label);
  expect(inspectEntry(plan.entries[0],[updated]).issue).toBe('');
  expect(plan.entries[0].priorityReason).toBe('Team observation');
});
it('leaves uploaded photos, unrelated illustrations and incomplete selections intact; migration runs once',async()=>{
  const photo={...legacy(),image:{...legacy().image!,kind:'photo' as const}};
  const other={...legacy(),image:{...legacy().image!,name:'My illustration'}};
  const blank={...legacy(),corners:{},layout:null};
  const result=replaceLegacySamples([photo,other,blank],supplied);
  expect(result[0]).toBe(photo);expect(result[1]).toBe(other);expect(result[2].corners).toEqual({});expect(result[2].layout).toBeNull();
  expect(isLegacySample(result[2])).toBe(false);
  expect(await upgradeLegacySamples(result)).toBe(result);
});
