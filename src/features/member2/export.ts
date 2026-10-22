import { buildWindowInput, PREVIEW_NOTICE } from './model';
import { projectDots, projectOutline } from './geometry';
import { validateLayout } from './validation';
import { loadImage } from './images';
import type { GuidelineProfile, PreviewResult, WindowDraft, WindowHandoff } from './types';

export function createHandoff(draft: WindowDraft, guideline: GuidelineProfile): WindowHandoff {
  const input = buildWindowInput(draft);
  if (!draft.layout || !draft.image) throw new Error('Generate or import a layout before exporting.');
  const validation = validateLayout(draft.layout, input, guideline);
  if (!validation.geometryPassed) throw new Error(validation.issues[0]);
  const preview: PreviewResult = { windowId: draft.windowId, layoutVersion: draft.layout.layoutVersion, photoRevision: draft.photoRevision,
    projectedDots: projectDots(draft.layout.dotsMm,draft.layout.dotDiameterMm,input.widthMm,input.heightMm,input.cornersNorm),
    ...(input.outlineMm?{outlineNorm:projectOutline(input.outlineMm,input.widthMm,input.heightMm,input.cornersNorm)}:{}) };
  return { schemaVersion:'0.1',exportedAt:new Date().toISOString(),input,originalDimensions:draft.dimensions,imageAsset:draft.image,
    guideline,layout:draft.layout,validation,preview,previewNotice:PREVIEW_NOTICE,...(draft.material?{material:draft.material}:{}) };
}
export function downloadBlob(blob: Blob, filename: string) {
  const url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 10_000);
}
export function downloadJson(value: unknown, filename: string) {
  downloadBlob(new Blob([JSON.stringify(value)],{type:'application/json'}),filename);
}
export async function exportPreview(handoff: WindowHandoff): Promise<Blob> {
  const image = await loadImage(handoff.imageAsset.dataUrl), width=handoff.imageAsset.widthPx, height=handoff.imageAsset.heightPx;
  const canvas=document.createElement('canvas'), footer=Math.max(90,Math.round(width*.09));
  canvas.width=width; canvas.height=height+footer;
  try {
  const ctx=canvas.getContext('2d'); if(!ctx) throw new Error('Preview export is unavailable.');
  ctx.drawImage(image,0,0,width,height); ctx.fillStyle='#ffffff';
  for(const dot of handoff.preview.projectedDots){
    ctx.beginPath(); dot.outlineNorm.forEach((p,i)=>i?ctx.lineTo(p.u*width,p.v*height):ctx.moveTo(p.u*width,p.v*height)); ctx.closePath();ctx.fill();
  }
  if(handoff.preview.outlineNorm){
    ctx.strokeStyle='#f3c969';ctx.lineWidth=Math.max(width/400,2);ctx.beginPath();
    handoff.preview.outlineNorm.forEach((p,i)=>i?ctx.lineTo(p.u*width,p.v*height):ctx.moveTo(p.u*width,p.v*height));ctx.closePath();ctx.stroke();
  }
  ctx.fillStyle='#143e35';ctx.fillRect(0,height,width,footer);ctx.fillStyle='#ffffff';
  const fontSize=Math.max(12,Math.round(width*.016));ctx.font=`${fontSize}px sans-serif`;
  ctx.fillText(PREVIEW_NOTICE,Math.round(width*.02),height+footer*.35);
  ctx.font=`${Math.max(10,Math.round(fontSize*.85))}px sans-serif`;
  ctx.fillText(`${handoff.input.widthMm} × ${handoff.input.heightMm} mm · ${handoff.layout.dotCount} dots · ${handoff.validation.status === 'pass' ? 'Geometry checked; site review required' : 'Prototype layout; review pending'}`,Math.round(width*.02),height+footer*.7);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed.')),'image/png'));
  } finally { canvas.width=0;canvas.height=0; }
}
