import type { WindowDraft } from '../features/member2/types';
import { projectDots } from '../features/member2/geometry';
import { treatmentFor } from '../demo/planning';

export function photoPreview(draft: WindowDraft | undefined) {
  if (!draft?.image) return null;
  try {
    const { request } = treatmentFor(draft);
    const projected = projectDots(draft.layout!.dotsMm, draft.layout!.dotDiameterMm, request.widthMm, request.heightMm, draft.corners as Required<WindowDraft['corners']>);
    const { widthPx: width, heightPx: height } = draft.image;
    return { image: draft.image, width, height,
      outline: projected.map(dot => dot.outlineNorm.map((p,i) => `${i?'L':'M'}${p.u*width},${p.v*height}`).join('')+'Z').join(''),
      corners: (['tl','tr','br','bl'] as const).map(key => ({ x:draft.corners[key]!.u*width, y:draft.corners[key]!.v*height })),
    };
  } catch { return null; }
}
export type PhotoPreviewData = NonNullable<ReturnType<typeof photoPreview>>;
