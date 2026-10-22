import { createHandoff } from '../features/member2/export';
import type { GuidelineProfile, WindowDraft } from '../features/member2/types';
import type { BuildingPlan } from './planning';
import { screenWindow } from '../features/screening/assessment';

function windowPart(draft: WindowDraft, guideline: GuidelineProfile) {
  let record;
  try { record = { state: 'preview', handoff: createHandoff(draft, guideline), ...(draft.screening?{screening:draft.screening,screeningResult:screenWindow(draft)}:{}) }; }
  catch (error) { record = { state: 'draft', draft, pending: (error as Error).message }; }
  // Convert each record to bytes before processing another pane's projected geometry.
  return new Blob([JSON.stringify(record)]);
}

function projectParts(windows: readonly WindowDraft[], plan: BuildingPlan, guideline: GuidelineProfile,
  onProgress: (completed: number, total: number) => void) {
  const snapshot = [...windows];
  const header = JSON.stringify({ schemaVersion: '0.1', module: 'BirdGlass', exportedAt: new Date().toISOString(), guideline, buildingPlan: plan });
  return (async function* () {
    yield new Blob([header.slice(0, -1), ',"windows":[']);
    for (let index = 0; index < snapshot.length; index++) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (index) yield new Blob([',']);
      yield windowPart(snapshot[index], guideline);
      onProgress(index + 1, snapshot.length);
    }
    yield new Blob([']}']);
  })();
}

/** Same v0.1 JSON structure, with one window's projection allocated at a time. */
export async function buildProjectData(windows: readonly WindowDraft[], plan: BuildingPlan, guideline: GuidelineProfile,
  onProgress: (completed: number, total: number) => void = () => {}) {
  const parts: BlobPart[] = [];
  for await (const part of projectParts(windows, plan, guideline, onProgress)) parts.push(part);
  return new Blob(parts, { type: 'application/json' });
}

/** Lossless gzip of the same JSON; never accumulates the full uncompressed project Blob. */
export async function buildCompressedProjectData(windows: readonly WindowDraft[], plan: BuildingPlan, guideline: GuidelineProfile,
  onProgress: (completed: number, total: number) => void = () => {}) {
  if (typeof CompressionStream === 'undefined') throw new Error('Compressed downloads are unavailable in this browser. Use Download project data instead.');
  const parts = projectParts(windows, plan, guideline, onProgress);
  let reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>> | undefined;
  const source = new ReadableStream<Uint8Array<ArrayBuffer>>({
    async pull(controller) {
      while (true) {
        if (reader) {
          const chunk = await reader.read();
          if (!chunk.done) { controller.enqueue(chunk.value); return; }
          reader.releaseLock(); reader = undefined;
        }
        const next = await parts.next();
        if (next.done) { controller.close(); return; }
        reader = next.value.stream().getReader();
      }
    },
    async cancel(reason) { await reader?.cancel(reason); await parts.return(); },
  });
  const compressed = await new Response(source.pipeThrough(new CompressionStream('gzip'))).blob();
  return new Blob([compressed], { type: 'application/gzip' });
}
