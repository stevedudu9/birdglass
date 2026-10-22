import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { BASELINE_GUIDELINE as guideline } from '../src/config/baseline';
import { buildLayoutRequest, createWindow } from '../src/features/member2/model';
import { createHandoff } from '../src/features/member2/export';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { buildCompressedProjectData, buildProjectData } from '../src/demo/projectExport';
import { emptyPlan } from '../src/demo/planning';

it('measures lossless export size for a 10000-dot pane through the project download builder',async()=>{
  const draft:WindowDraft={...createWindow('Large export example'),dimensions:{width:'5000',height:'5000',unit:'mm'},
    image:{imageId:'size-fixture',name:'synthetic.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1280,heightPx:900,orientationNormalized:true,kind:'illustration'},
    corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
  draft.layout=generatePattern(buildLayoutRequest(draft,guideline),guideline);
  const handoff=createHandoff(draft,guideline);
  expect(handoff.layout.dotCount).toBe(10000);
  expect(handoff.preview.projectedDots).toHaveLength(10000);
  expect(handoff.preview.projectedDots.every(dot=>dot.outlineNorm.length===48)).toBe(true);
  const formattedBytes=new Blob([JSON.stringify(handoff,null,2)]).size;
  const compactBytes=new Blob([JSON.stringify(handoff)]).size;
  expect(compactBytes).toBeLessThan(formattedBytes*.6);
  const blob=await buildProjectData([draft],emptyPlan(),guideline);
  const project=JSON.parse(await blob.text()),exported=project.windows[0].handoff;
  expect(exported.layout).toEqual(draft.layout);
  for(const index of [0,4999,9999]) expect(exported.preview.projectedDots[index]).toEqual(handoff.preview.projectedDots[index]);
  expect(exported.preview.projectedDots).toHaveLength(10000);
  const gzip=await buildCompressedProjectData([draft],emptyPlan(),guideline);
  expect(gzip.size).toBeLessThan(blob.size*.6);
  const restored=JSON.parse(await new Response(gzip.stream().pipeThrough(new DecompressionStream('gzip'))).text()).windows[0].handoff;
  expect(restored.layout).toEqual(draft.layout);
  for(const index of [0,4999,9999]) expect(restored.preview.projectedDots[index]).toEqual(handoff.preview.projectedDots[index]);
  const results={dotCount:10000,outlineVertices:480000,formattedHandoffBytes:formattedBytes,compactHandoffBytes:compactBytes,
    reductionPercent:Number(((1-compactBytes/formattedBytes)*100).toFixed(2)),singleWindowProjectBytes:blob.size,
    gzipProjectBytes:gzip.size,gzipReductionPercent:Number(((1-gzip.size/blob.size)*100).toFixed(2)),
    note:'Same numbers, physical coordinates, schema and all 48 outline points per dot. Placeholder image; real photos add bytes. Size comparison excludes transfer compression; this is not a real-phone memory or latency test.'};
  writeFileSync('benchmarks/latest-export-results.json',JSON.stringify(results,null,2));
});
