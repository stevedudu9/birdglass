import { loadImage } from '../features/member2/images';
import { buildLayoutRequest, createWindow } from '../features/member2/model';
import { generatePattern } from '../features/member3';
import { BASELINE_GUIDELINE } from '../config/baseline';
import type { CornersNorm, ImageAsset, WindowDraft } from '../features/member2/types';

export const SAMPLE_IMAGE_URL = '/images/window-example.png';
export const SAMPLE_IMAGE_NAME = 'BirdGlass supplied window example v2';
// Exposed glass only, excluding the black frame. Pixel positions refer to the
// supplied 1448 × 1086 image; real installation dimensions cannot be inferred.
export const SAMPLE_CORNERS: CornersNorm = {
  tl: { u:384/1448, v:201/1086 }, tr: { u:1191/1448, v:203/1086 },
  br: { u:1193/1448, v:810/1086 }, bl: { u:385/1448, v:811/1086 },
};

async function sampleImage(): Promise<ImageAsset> {
  const response = await fetch(SAMPLE_IMAGE_URL);
  if (!response.ok) throw new Error('The example window image could not be loaded.');
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve,reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('The example window image could not be read.'));
    reader.readAsDataURL(blob);
  });
  const image = await loadImage(dataUrl);
  return { imageId:'birdglass-window-example-v2', name:SAMPLE_IMAGE_NAME, dataUrl,
    widthPx:image.naturalWidth, heightPx:image.naturalHeight, orientationNormalized:true, kind:'illustration' };
}

/** Supplied example image, with explicitly illustrative physical measurements. */
export async function createSampleWindow(): Promise<WindowDraft> {
  const draft: WindowDraft = { ...createWindow('Garden-facing window'), image:await sampleImage(),
    corners:structuredClone(SAMPLE_CORNERS), dimensions:{width:'120',height:'150',unit:'cm'},
    photoRevision:1, dimensionRevision:1 };
  draft.layout=generatePattern(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);
  return draft;
}

export function isLegacySample(draft: WindowDraft) {
  return draft.image?.kind === 'illustration' && draft.image.name === 'Illustrated sample window'
    && draft.image.widthPx === 1280 && draft.image.heightPx === 900;
}

/** Replace only the old built-in asset. Physical layouts and plan references
 * remain valid because measured dimensions, IDs and layout versions are kept. */
export function replaceLegacySamples(windows: WindowDraft[], image: ImageAsset): WindowDraft[] {
  return windows.map(draft => isLegacySample(draft) ? { ...draft, image,
    corners:Object.keys(draft.corners).length ? structuredClone(SAMPLE_CORNERS) : {},
    photoRevision:draft.photoRevision+1 } : draft);
}

export async function upgradeLegacySamples(windows: WindowDraft[]): Promise<WindowDraft[]> {
  return windows.some(isLegacySample) ? replaceLegacySamples(windows,await sampleImage()) : windows;
}
