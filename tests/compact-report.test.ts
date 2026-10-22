// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { BASELINE_GUIDELINE as guideline } from '../src/config/baseline';
import { buildLayoutRequest, createWindow, setDimensions } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import * as exports from '../src/features/member2/export';
import { buildTreatmentReport, createTreatmentReport, downloadTreatmentReport } from '../src/demo/treatmentReport';
import { emptyPlan, planEntry, treatmentFor } from '../src/demo/planning';

afterEach(()=>vi.restoreAllMocks());
function fixture(label='Lobby pane') {
  const draft:WindowDraft={...createWindow(label),dimensions:{width:'120',height:'70',unit:'mm'},
    image:{imageId:'fixture',name:'photo.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1280,heightPx:900,orientationNormalized:true,kind:'illustration'},
    corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
  draft.layout=generatePattern(buildLayoutRequest(draft,guideline),guideline);return draft;
}
it('uses PNG previews while preserving exact written quantities, escaped labels and purchasing',async()=>{
  const render=vi.spyOn(exports,'exportPreview').mockResolvedValue(new Blob(['png-test'],{type:'image/png'}));
  const drafts=[fixture('<script>Lobby</script>'),fixture('Courtyard')],progress=vi.fn();
  const plan={...emptyPlan(),costMode:'legacy' as const,purchasing:{format:'film' as const,allowance:'0',unitPrice:'100'}};
  const html=await createTreatmentReport(drafts.map(treatmentFor),plan,true,progress,{debugMode:true});
  expect((html.match(/<img class="report-preview"/g)||[]).length).toBe(2);
  expect(html).not.toContain('<svg');expect(html).not.toContain('<path');
  expect(html).toContain('12</strong> dots');expect(html).toContain('0.0168 m²');expect(html).toContain('RM 1.68');
  expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<script>');
  expect(html).toContain('Print / Save as PDF');expect(html).toContain('not a scale installation template');
  expect(render).toHaveBeenCalledTimes(2);
  expect(render.mock.calls[0][0].layout).toEqual(drafts[0].layout);
  expect(progress.mock.calls).toEqual([[1,2],[2,2]]);
});
it('revalidates and rejects stale layouts before drawing a report',async()=>{
  const render=vi.spyOn(exports,'exportPreview'),draft=fixture(),treatment=treatmentFor(draft);
  const changed={...setDimensions(draft,{width:'130',height:'70',unit:'mm'}),layout:draft.layout};
  await expect(createTreatmentReport([{...treatment,draft:changed}],emptyPlan())).rejects.toThrow('Generate');
  expect(render).not.toHaveBeenCalled();
});
it('does not download a partial report if PNG generation fails',async()=>{
  vi.spyOn(exports,'exportPreview').mockRejectedValue(new Error('PNG allocation failed'));
  const download=vi.spyOn(exports,'downloadBlob').mockImplementation(()=>{});
  await expect(downloadTreatmentReport([treatmentFor(fixture())],emptyPlan())).rejects.toThrow('PNG allocation failed');
  expect(download).not.toHaveBeenCalled();
});
it('rejects missing or unsafe preview replacements instead of embedding untrusted markup',()=>{
  const treatment=treatmentFor(fixture());
  expect(()=>buildTreatmentReport([treatment],emptyPlan(),false,new Map())).toThrow('preview image');
  expect(()=>buildTreatmentReport([treatment],emptyPlan(),false,new Map([[treatment.draft.windowId,'javascript:alert(1)']]))).toThrow('preview image');
});
it('rejects a non-PNG preview result',async()=>{
  vi.spyOn(exports,'exportPreview').mockResolvedValue(new Blob(['x'],{type:'text/html'}));
  await expect(createTreatmentReport([treatmentFor(fixture())],emptyPlan())).rejects.toThrow('PNG');
});

it('renders downloaded building previews only for selected panes',async()=>{
  const included=fixture('Included pane'),excluded=fixture('Deselected pane');
  const plan={...emptyPlan(),entries:[planEntry(included),{...planEntry(excluded),selected:false}]};
  const items=[treatmentFor(included),treatmentFor(excluded)];
  excluded.layout=null;
  const render=vi.spyOn(exports,'exportPreview').mockResolvedValue(new Blob(['png-test'],{type:'image/png'}));
  const progress=vi.fn();
  const html=await createTreatmentReport(items,plan,true,progress);
  expect(html).toContain('Included pane');expect(html).not.toContain('Deselected pane');
  expect(render).toHaveBeenCalledTimes(1);expect(progress.mock.calls).toEqual([[1,1]]);
});
