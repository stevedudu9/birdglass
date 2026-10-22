import { materialReport, projectCostReport } from '../features/materials/report';
import { tryMaterialEstimate } from '../features/materials/estimate';
import { screeningReport } from '../features/screening/report';
import { effectiveScreening } from '../features/screening/assessment';
import { PRIORITY_LABELS } from '../features/screening/config';
import { BASELINE_GUIDELINE } from '../config/baseline';
import { createHandoff, downloadBlob, exportPreview } from '../features/member2/export';
import type { BuildingPlan, Treatment } from './planning';
import { budgetStatus, planningViewPlan, purchasingEstimate, treatmentFor } from './planning';

import { escapeHtml } from './html';
import { treatmentSummary } from './treatmentSummary';
export type ReportOptions = { debugMode?: boolean };
export { escapeHtml } from './html';
const number = (value: number) => Number(value.toFixed(4)).toLocaleString('en-MY', { maximumFractionDigits: 4 });

function preview(treatment: Treatment, previewImages?: ReadonlyMap<string, string>) {
  const { draft } = treatment;
  const caption = `<p class="caption">${draft.image?.kind === 'illustration' ? 'Illustrated example; not a field photograph. ' : ''}Planning preview; not a scale installation template.</p>`;
  if (previewImages) {
    const source = previewImages.get(draft.windowId);
    if (!source || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(source)) throw new Error('A report preview image is unavailable. Try downloading again.');
    return `<img class="report-preview" src="${source}" alt="Proposed dot treatment">${caption}`;
  }
  const handoff = createHandoff(draft, BASELINE_GUIDELINE);
  const image = handoff.imageAsset;
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\r\n]+$/.test(image.dataUrl)) throw new Error('The photo cannot be included in this summary. Replace the photo and try again.');
  const paths = handoff.preview.projectedDots.map(dot => dot.outlineNorm.map((point, index) => `${index ? 'L' : 'M'}${(point.u * image.widthPx).toFixed(2)} ${(point.v * image.heightPx).toFixed(2)}`).join(' ') + 'Z').join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${image.widthPx} ${image.heightPx}" role="img" aria-label="Proposed dot treatment"><image href="${escapeHtml(image.dataUrl)}" width="${image.widthPx}" height="${image.heightPx}"/><path d="${paths}" fill="white"/></svg><p class="caption">${image.kind === 'illustration' ? 'Illustrated example; not a field photograph. ' : ''}Planning preview; not a scale installation template.</p>`;
}

// Apply building-plan selection before validating layouts or rendering photo previews.
function selectedReportTreatments(treatments: Treatment[], plan: BuildingPlan, buildingReport: boolean) {
  return buildingReport ? treatments.filter(item => plan.entries.find(entry => entry.windowId === item.draft.windowId)?.selected !== false) : treatments;
}

export function buildTreatmentReport(treatments: Treatment[], plan: BuildingPlan, includePurchasing = false, previewImages?: ReadonlyMap<string, string>, options:ReportOptions={}) {
  treatments = selectedReportTreatments(treatments, plan, includePurchasing);
  plan = planningViewPlan(plan, options.debugMode);
  if (!treatments.length) throw new Error('Select a current treatment before downloading a summary.');
  treatments=treatments.map(item=>{const current=treatmentSummary(item.draft).treatment;if(!current)throw new Error('Generate a current valid layout before downloading a summary.');return current;});
  const validationPassed=treatments.every(item=>item.check.status==='pass');
  const totalArea = treatments.reduce((sum, item) => sum + item.quantities.windowAreaM2, 0);
  const totalDots = treatments.reduce((sum, item) => sum + item.quantities.dotCount, 0);
  const estimate = includePurchasing && plan.costMode==='legacy' ? purchasingEstimate(plan.purchasing, totalArea, totalDots, treatments.length) : null;
  const title = plan.name.trim() || 'Window treatment plan';
  const budget = includePurchasing && plan.budgetEnabled ? budgetStatus(plan.budget, estimate?.totalCost ?? null) : { amount: null, remaining: null };
  const priorityText = (windowId:string) => {
    const draft=treatments.find(item=>item.draft.windowId===windowId)!.draft;
    const result=effectiveScreening(draft,plan.entries.find(entry=>entry.windowId===windowId));
    return `${PRIORITY_LABELS[result.effective]}${result.override||result.legacyOverride?` — user override: ${result.override?.reason??result.legacyOverride?.priorityReason}`:''}`;
  };
  const money = (value: number | null) => value === null ? 'Quote / charges needed' : `RM ${value.toFixed(2)}`;
  const purchase = estimate ? `<section><h2>Material planning</h2><p>${plan.purchasing.format === 'film' ? 'Full-pane patterned film' : 'Individual adhesive dots'} · ${number(estimate.allowance)}% additional material allowance.</p>
    <p><strong>${number(estimate.quantity)} ${estimate.unit}</strong> estimated material quantity.</p>
    ${plan.purchasing.format === 'dots' ? `<p>${estimate.packs === null ? 'Dots per pack needed.' : `${number(estimate.packs)} packs × ${number(estimate.packSize!)} dots = ${number(estimate.purchasedDots!)} dots purchased. Packs shared across the building.`} Pack price: ${money(estimate.packPrice)}.</p>` : `<p>Supplier price per m²: ${money(estimate.unitPrice)}.</p>`}
    <p>Estimated material subtotal: <strong>${money(estimate.cost)}</strong>.</p>
    <p>Installation: ${treatments.length} windows × ${money(estimate.installationPerWindow)} + one project charge ${money(estimate.projectCharge)}. Installation subtotal: <strong>${money(estimate.installationCost)}</strong>.</p>
    <p>Total estimated cost: <strong>${money(estimate.totalCost)}</strong>.</p><p>Selected windows: ${treatments.length} of ${plan.entries.length}. ${budget.amount === null ? 'No budget entered.' : `Budget: ${money(budget.amount)}. ${budget.remaining === null ? 'Budget comparison pending complete quotes.' : budget.remaining < 0 ? `Over budget by ${money(-budget.remaining)}.` : `Budget remaining: ${money(budget.remaining)}.`}`}</p>
    <p>Blank prices or charges are unknown, not free. Film roll cutting and minimum orders are not calculated. Confirm the final order and charges with the supplier.</p></section>` : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} — BirdGlass</title><style>
  *{box-sizing:border-box}body{font:15px/1.6 Arial,sans-serif;color:#263e33;background:#f3f5ef;margin:0}main{max-width:900px;margin:auto;background:white;padding:38px}h1{font-size:32px;line-height:1.2;margin:8px 0}h2{font-size:21px;margin:24px 0 10px}p{margin:8px 0}.eyebrow{font-size:11px;letter-spacing:2px;color:#55704a}.totals{padding:18px 0;border-block:1px solid #cdd7c6;font-size:19px;margin:23px 0}.review{background:#f8f3e4;padding:14px}.spec{background:#eaf0e2;padding:14px}article{margin-top:30px;border-top:2px solid #28543d;padding-top:10px}svg,.report-preview{display:block;height:auto;max-width:100%;max-height:430px;margin:15px auto}.caption{font-size:12px;color:#66745e}table{border-collapse:collapse;width:100%;margin:14px 0}td,th{border-bottom:1px solid #dae2d4;text-align:left;padding:9px;vertical-align:top}th{font-weight:600}details{font-size:12px;color:#617057;overflow-wrap:anywhere;margin-top:16px}button{border:0;background:#20543f;color:white;padding:12px 18px;cursor:pointer;font:inherit}footer{margin-top:30px;padding-top:16px;border-top:1px solid #cdd7c6;font-size:12px}a{color:#28543d}@page{size:A4;margin:16mm}@media(max-width:600px){main{padding:22px 16px}body{font-size:13px}h1{font-size:26px}table{table-layout:fixed}td,th{padding:8px 5px;font-size:12px;overflow-wrap:anywhere}svg,.report-preview{max-height:none}}@media print{body{background:white;font-size:11pt}main{padding:0;max-width:none}button{display:none}article{break-before:page}h2,table,svg,.report-preview,.review{break-inside:avoid}a{color:inherit;text-decoration:none}thead{display:table-header-group}}
  </style></head><body><main><button onclick="window.print()">Print / Save as PDF</button><p class="eyebrow">BIRDGLASS · RETROFIT PLANNING</p><h1>${escapeHtml(title)}</h1><p>Treatment summary · ${escapeHtml(new Date().toLocaleDateString('en-MY'))}</p><div class="totals"><strong>${treatments.length}</strong> window${treatments.length === 1 ? '' : 's'} · <strong>${totalDots.toLocaleString('en-MY')}</strong> dots · <strong>${number(totalArea)} m²</strong> glass</div><p class="spec">10 mm white circular dots · fixed 50 × 50 mm centre spacing · exterior application across each selected pane.</p><p class="review"><strong>${validationPassed?'Pattern validation passed.':'Pattern validation incomplete.'}</strong> ${validationPassed?'':'Dot geometry checks pass; the configured guideline review is pending.'} Guideline applicability, material suitability, visibility, exterior access and installation conditions still need site review. This planning summary does not certify collision prevention.</p><table><thead><tr><th>Window / location</th><th>Screening priority / override</th><th>Glass size</th><th>Dots</th><th>Glass area</th><th>Treatment choice</th><th>Estimated cost</th></tr></thead><tbody>${treatments.map(item => { const est = tryMaterialEstimate(item.draft).estimate; const matName = est?.material?.name ?? 'Treatment material not selected'; const matCost = est?.materialCost !== null && est?.materialCost !== undefined ? `RM ${est.materialCost.toFixed(2)}` : 'Quotation required'; const labCost = est?.installationCost !== null && est?.installationCost !== undefined ? `RM ${est.installationCost.toFixed(2)}` : 'Quotation required'; return `<tr><td>${escapeHtml(item.draft.label || 'Unnamed window')}<br>${escapeHtml(plan.entries.find(entry => entry.windowId === item.draft.windowId)?.location || 'Location not recorded')}</td><td>${escapeHtml(priorityText(item.draft.windowId))}</td><td>${number(item.request.widthMm)} × ${number(item.request.heightMm)} mm</td><td>${item.quantities.dotCount}</td><td>${number(item.quantities.windowAreaM2)} m²</td><td>${escapeHtml(matName)}</td><td>Material: ${matCost}<br>Labour: ${labCost}</td></tr>`; }).join('')}</tbody></table>${purchase}${includePurchasing&&plan.costMode!=='legacy'?projectCostReport(treatments,plan):''}
  ${treatments.map(item => { const gaps = item.check.measurements!.boundaryClearGapsMm; return `<article><h2>${escapeHtml(item.draft.label || 'Unnamed window')}</h2><p>${escapeHtml(plan.entries.find(entry => entry.windowId === item.draft.windowId)?.location || 'Location not recorded')}</p><p>Preliminary screening priority: ${escapeHtml(priorityText(item.draft.windowId))}</p>${preview(item, previewImages)}<table><tbody><tr><th>Measured glass</th><td>${number(item.request.widthMm)} × ${number(item.request.heightMm)} mm</td></tr><tr><th>Pattern</th><td>${item.check.measurements!.shaped ? `${item.check.measurements!.shaped.latticeDots} grid dots clipped to the glass outline + ${item.check.measurements!.shaped.edgeDots} edge-coverage dots; ${item.quantities.dotCount} complete dots` : `${item.draft.layout!.rows} rows × ${item.draft.layout!.columns} columns; ${item.quantities.dotCount} complete dots`}</td></tr><tr><th>Adjacent clear gap</th><td>40 mm where neighbouring dots exist; centre spacing remains 50 mm.</td></tr>${item.check.measurements!.shaped ? `<tr><th>Edge coverage (shaped pane)</th><td>Largest gap to a dot edge ${number(item.check.measurements!.shaped.maxGapMm)} mm; BG-EDGE-002 limit ${number(item.check.measurements!.shaped.edgeLimitMm)} mm (${number(item.check.measurements!.shaped.cornerLimitMm)} mm at sharp corners), pending team review.</td></tr>` : `<tr><th>Clear boundary gaps</th><td>Left ${number(gaps.left)} mm · Right ${number(gaps.right)} mm · Top ${number(gaps.top)} mm · Bottom ${number(gaps.bottom)} mm</td></tr>`}<tr><th>Glass area</th><td>${number(item.quantities.windowAreaM2)} m². Purchase quantity depends on material format, allowance and supplier rules.</td></tr></tbody></table>${options.debugMode?`<details><summary>Record identifiers</summary><p>Window: ${escapeHtml(item.draft.windowId)} · dimension revision: ${item.draft.dimensionRevision}<br>Layout: ${escapeHtml(item.draft.layout!.layoutVersion)}<br>Algorithm: ${escapeHtml(item.draft.layout!.algorithmVersion)}<br>Guideline: ${escapeHtml(item.request.guidelineId)} / ${escapeHtml(item.request.guidelineVersion)}</p></details>`:''}${materialReport(item)}${screeningReport(item.draft,plan.entries.find(entry=>entry.windowId===item.draft.windowId))}</article>`; }).join('')}
  <footer><p>Priorities use preliminary project screening rules and recorded user overrides, not calculated collision-risk scores.</p></footer></main></body></html>`;
}

function pngDataUrl(blob: Blob): Promise<string> {
  if (blob.type !== 'image/png' || !blob.size) throw new Error('The report preview could not be rendered as a PNG.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The report preview could not be read.'));
    reader.onerror = () => reject(new Error('The report preview could not be read.'));
    reader.readAsDataURL(blob);
  });
}

async function previewImage(treatment: Treatment) {
  const handoff = createHandoff(treatment.draft, BASELINE_GUIDELINE);
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\r\n]+$/.test(handoff.imageAsset.dataUrl)) throw new Error('The photo cannot be included in this summary. Replace the photo and try again.');
  return pngDataUrl(await exportPreview(handoff));
}

/** Readable download: source-resolution PNG previews, exact written quantities; internal IDs are opt-in. */
export async function createTreatmentReport(treatments: Treatment[], plan: BuildingPlan, includePurchasing = false,
  onProgress: (completed: number, total: number) => void = () => {}, options:ReportOptions={}) {
  const current = selectedReportTreatments(treatments, plan, includePurchasing).map(item => treatmentFor(item.draft));
  if (!current.length) throw new Error('Select a current treatment before downloading a summary.');
  const previewImages = new Map<string, string>();
  for (let index = 0; index < current.length; index++) {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    previewImages.set(current[index].draft.windowId, await previewImage(current[index]));
    onProgress(index + 1, current.length);
  }
  return buildTreatmentReport(current, plan, includePurchasing, previewImages, options);
}

export async function downloadTreatmentReport(treatments: Treatment[], plan: BuildingPlan, includePurchasing = false,
  onProgress: (completed: number, total: number) => void = () => {}, options:ReportOptions={}) {
  const html = await createTreatmentReport(treatments, plan, includePurchasing, onProgress, options);
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), 'birdglass-treatment-summary.html');
}




