import { afterEach, expect, it, vi } from 'vitest';
import { BASELINE_GUIDELINE as guideline } from '../src/config/baseline';
import { buildLayoutRequest, createWindow, setDimensions } from '../src/features/member2/model';
import { createHandoff } from '../src/features/member2/export';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { buildCompressedProjectData, buildProjectData } from '../src/demo/projectExport';
import { emptyPlan, planEntry } from '../src/demo/planning';
import { applyOverride } from '../src/features/screening/assessment';
import { SCREENING_CONFIG } from '../src/features/screening/config';

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('exports observations, rule reasons and recorded overrides with preview and draft records',async()=>{
  const ready=fixture('Screened');
  ready.screening={inputs:{collisions:'yes',treatment:'none'},collisionEvidence:'Synthetic test record'};
  const changed=applyOverride(ready,'medium','Synthetic inspection explanation');
  const unfinished={...changed,windowId:crypto.randomUUID(),layout:null};
  const parsed=JSON.parse(await(await buildProjectData([changed,unfinished],emptyPlan(),guideline)).text());
  expect(parsed.windows[0].screening).toEqual(changed.screening);
  expect(parsed.windows[0].screeningResult).toMatchObject({recommended:'high',effective:'medium',configVersion:SCREENING_CONFIG.version});
  expect(parsed.windows[0].screeningResult.reasons.some((r:{id:string})=>r.id==='H-COLLISION')).toBe(true);
  expect(parsed.windows[1].draft.screening.override.reason).toBe('Synthetic inspection explanation');
});
function fixture(label:string):WindowDraft {
  const draft:WindowDraft={...createWindow(label),dimensions:{width:'120',height:'70',unit:'mm'},
    image:{imageId:'shared-image',name:'photo.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1280,heightPx:900,orientationNormalized:true,kind:'illustration'},
    corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
  draft.layout=generatePattern(buildLayoutRequest(draft,guideline),guideline);return draft;
}

it('preserves the complete v0.1 structure for eight windows while reporting progress',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-16T05:00:00Z'));
  const windows=Array.from({length:8},(_,i)=>fixture(`Pane ${i+1} 窗`));
  const plan={...emptyPlan(),name:'Block A',entries:windows.map(draft=>planEntry(draft,'Garden'))};
  const progress=vi.fn();
  const pending=buildProjectData(windows,plan,guideline,progress);
  expect(progress).not.toHaveBeenCalled();
  const blob=await pending;
  expect(blob.type).toBe('application/json');
  expect(progress.mock.calls).toEqual(Array.from({length:8},(_,i)=>[i+1,8]));
  const parsed=JSON.parse(await blob.text());
  expect(parsed).toEqual({schemaVersion:'0.1',module:'BirdGlass',exportedAt:new Date().toISOString(),guideline,buildingPlan:plan,
    windows:windows.map(draft=>({state:'preview',handoff:createHandoff(draft,guideline)}))});
});

it('preserves unfinished and stale windows as drafts without silently exporting a stale preview',async()=>{
  const valid=fixture('Ready'),unfinished=createWindow('No photo'),stale={...setDimensions(valid,{width:'130',height:'70',unit:'mm'}),layout:valid.layout};
  const parsed=JSON.parse(await (await buildProjectData([valid,unfinished,stale],emptyPlan(),guideline)).text());
  expect(parsed.windows[0].state).toBe('preview');
  expect(parsed.windows[1]).toMatchObject({state:'draft',draft:unfinished,pending:expect.any(String)});
  expect(parsed.windows[2]).toMatchObject({state:'draft',draft:stale,pending:expect.stringContaining('outdated')});
  expect(parsed.windows[2].handoff).toBeUndefined();
});

it('keeps a snapshot of the selected collection while the asynchronous export is running',async()=>{
  const windows=[fixture('Original')];
  const pending=buildProjectData(windows,emptyPlan(),guideline);
  windows.push(fixture('Added later'));
  const parsed=JSON.parse(await (await pending).text());
  expect(parsed.windows).toHaveLength(1);
  expect(parsed.windows[0].handoff.input.label).toBe('Original');
});
it('gzip decompresses to byte-identical v0.1 JSON including all eight windows and original precision',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-16T05:00:00Z'));
  const windows=Array.from({length:8},(_,i)=>fixture(`Pane ${i+1} 窗`)),plan=emptyPlan(),progress=vi.fn();
  const plain=await buildProjectData(windows,plan,guideline);
  const gzip=await buildCompressedProjectData(windows,plan,guideline,progress);
  expect(gzip.type).toBe('application/gzip');
  expect([...new Uint8Array(await gzip.slice(0,2).arrayBuffer())]).toEqual([31,139]);
  const decompressed=await new Response(gzip.stream().pipeThrough(new DecompressionStream('gzip'))).text();
  expect(decompressed).toBe(await plain.text());
  expect(gzip.size).toBeLessThan(plain.size);
  expect(progress.mock.calls).toEqual(Array.from({length:8},(_,i)=>[i+1,8]));
});
it('preserves the collection snapshot for compressed exports and reports streaming failures',async()=>{
  const windows=[fixture('Original')];
  const pending=buildCompressedProjectData(windows,emptyPlan(),guideline);
  windows.push(fixture('Added later'));
  const gzip=await pending;
  const parsed=JSON.parse(await new Response(gzip.stream().pipeThrough(new DecompressionStream('gzip'))).text());
  expect(parsed.windows).toHaveLength(1);
  await expect(buildCompressedProjectData(windows,emptyPlan(),guideline,()=>{throw new Error('Injected streaming failure');})).rejects.toThrow('Injected streaming failure');
});
it('offers a useful fallback when native compression is unavailable',async()=>{
  vi.stubGlobal('CompressionStream',undefined);
  await expect(buildCompressedProjectData([fixture('Pane')],emptyPlan(),guideline)).rejects.toThrow('Use Download project data');
});
