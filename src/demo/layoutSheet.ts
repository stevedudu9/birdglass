import { downloadBlob } from '../features/member2/export';
import { treatmentFor } from './planning';
import type { Treatment } from './planning';
import { escapeHtml } from './html';
import type { ReportOptions } from './treatmentReport';
import { physicalDotPath } from './dotPath';
import { gridMetrics } from '../features/member3';

const number = (value: number) => Number(value.toFixed(4)).toLocaleString('en-MY');

/** Shaped panes: grid lines to mark, then each edge-coverage dot by its measured centre. */
function shapedSteps(treatment: Treatment) {
  const { draft, request, check } = treatment, layout = draft.layout!, shaped = check.measurements!.shaped!;
  const grid = gridMetrics(request.widthMm, request.heightMm);
  const columns = Array.from({ length: grid.columns }, (_, i) => grid.startXmm + i * 50);
  const rows = Array.from({ length: grid.rows }, (_, i) => grid.startYmm + i * 50);
  const list = (values: number[]) => values.length > 8 ? `${values.slice(0, 3).map(number).join(', ')} … ${values.slice(-2).map(number).join(', ')}` : values.map(number).join(', ');
  const edgeDots = layout.dotsMm.filter(dot => !dot.id.startsWith('r'));
  return `<h2>1. Mark the 50 mm grid lines</h2><p>Measure from the left and top of the bounding box (the measured width and height), not from the curved or sloping edge.</p>
  <div class="start"><div><span>VERTICAL LINES FROM THE LEFT</span><strong>${number(grid.startXmm)} mm</strong><small>then every 50 mm (${list(columns)} mm)</small></div><div><span>HORIZONTAL LINES FROM THE TOP</span><strong>${number(grid.startYmm)} mm</strong><small>then every 50 mm (${list(rows)} mm)</small></div></div>
  <ol><li>Apply a dot at each line crossing where the <strong>whole 10 mm dot</strong> lies on the glass: <strong>${shaped.latticeDots.toLocaleString('en-MY')} grid dots</strong>.</li><li>Skip crossings where the dot would touch or cross the glass edge.</li></ol>
  <h2>2. Add the edge-coverage dots</h2><p>${edgeDots.length ? `Place these <strong>${edgeDots.length}</strong> dots by their centre, measured from the left and top of the bounding box.` : 'This outline needs no extra edge dots.'}</p>
  ${edgeDots.length ? `<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left">Dot</th><th style="text-align:right">From left</th><th style="text-align:right">From top</th></tr></thead><tbody>${edgeDots.map((dot, i) => `<tr><td>E${i + 1}</td><td style="text-align:right">${number(dot.xMm)} mm</td><td style="text-align:right">${number(dot.yMm)} mm</td></tr>`).join('')}</tbody></table>` : ''}
  <h2>3. Check edge coverage</h2><p>No point on the glass should be more than ${number(shaped.edgeLimitMm)} mm from the nearest dot edge (${number(shaped.cornerLimitMm)} mm at sharp corners). Largest gap in this layout: <strong>${number(shaped.maxGapMm)} mm</strong>. BG-EDGE-002 is derived from the 25 mm rectangle rule and awaits team review.</p>`;
}

/** A dimensioned reference, deliberately not a 1:1 adhesive placement template. */
export function buildLayoutSheet(input: Treatment, options:ReportOptions={}) {
  // Revalidate the current record at export time, including its revision and guideline.
  const treatment = treatmentFor(input.draft);
  const { draft, request, check, quantities } = treatment;
  const layout = draft.layout!, gaps = check.measurements!.boundaryClearGapsMm;
  // Measured minimum coordinates identify the top-left dot regardless of list order.
  const dotRadiusMm = layout.dotDiameterMm / 2;
  const first = { xMm: gaps.left + dotRadiusMm, yMm: gaps.top + dotRadiusMm };
  const scale = Math.min(420 / request.widthMm, 250 / request.heightMm);
  const width = request.widthMm * scale, height = request.heightMm * scale;
  const x = (680 - width) / 2, y = 68 + (250 - height) / 2;
  const pitch = 50 * scale, radius = 5 * scale, firstX = x + first.xMm * scale, firstY = y + first.yMm * scale;
  const title = escapeHtml(draft.label || 'Window treatment');
  const shape = layout.shape, shaped = check.measurements!.shaped;
  const glassShape = shape ? `<path d="${shape.outlineMm.map((p, i) => `${i ? 'L' : 'M'}${(x + p.xMm * scale).toFixed(2)} ${(y + p.yMm * scale).toFixed(2)}`).join('')}Z" fill="#365e50" stroke="#254c3a"/>` : `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#365e50" stroke="#254c3a"/>`;
  // A validated rectangle is a complete centred grid, so one repeating tile is exact and compact.
  const dotsSvg = shape ? `${glassShape}<path d="${physicalDotPath(layout.dotsMm, dotRadiusMm, scale, x, y)}" fill="white"/>`
    : `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#365e50"/><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#sheet-grid)" stroke="#254c3a"/>`;
  const horizontal = layout.columns === 1 ? 'Apply one dot per row (one column: no horizontal repeat).' : `Apply <strong>${layout.columns} dots per row</strong>, with centres <strong>50 mm apart</strong>.`;
  const vertical = layout.rows === 1 ? 'Apply one row only (no vertical repeat).' : `Repeat for <strong>${layout.rows} rows</strong>, with row centres <strong>50 mm apart</strong>.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} — placement sheet</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f2f5ec;color:#284332;font:14px/1.55 Arial,sans-serif}main{max-width:850px;background:white;margin:auto;padding:28px 36px}h1{margin:6px 0;font-size:27px;line-height:1.2}h2{font-size:17px;margin:18px 0 8px}p{margin:6px 0}.eyebrow{font-size:10px;letter-spacing:1.6px;color:#607951}.summary{border-block:1px solid #d5dfcd;padding:12px 0;margin:16px 0}.notice{background:#f8f2df;padding:11px;font-size:12px}svg{display:block;width:100%;max-height:350px;margin:10px 0}svg text{font:14px Arial,sans-serif;fill:#34513b}.start{display:grid;grid-template-columns:1fr 1fr;gap:16px;background:#edf3e4;padding:15px}.start span{display:block;font-size:11px}.start strong{font-size:23px;font-weight:600}.start small{display:block;font-size:11px}.edges{display:grid;grid-template-columns:repeat(4,1fr);border-block:1px solid #dce4d5;margin:12px 0;padding:10px 0;gap:12px;font-size:12px}.edges strong{display:block;font-size:16px}ol{padding-left:20px;margin:8px 0}li{padding:2px 0}.footnote{font-size:10px;color:#607055}.actions{display:flex;justify-content:space-between;gap:12px;align-items:center}button{background:#24563e;border:0;color:white;padding:10px 15px;cursor:pointer;font:inherit}.actions span{font-size:11px;font-weight:bold}@page{size:A4;margin:12mm}@media print{body{background:white;font-size:10pt}main{padding:0}button{display:none}svg{max-height:290px}.start,.edges,svg{break-inside:avoid}h2{break-after:avoid}.actions{justify-content:flex-end}}@media(max-width:500px){main{padding:20px 16px}.edges{grid-template-columns:1fr 1fr}.start strong{font-size:20px}h1{font-size:24px}.actions{flex-wrap:wrap}}
  </style></head><body><main><div class="actions"><button onclick="window.print()">Print / Save as PDF</button><span>DIMENSIONED REFERENCE · NOT TO SCALE</span></div><p class="eyebrow">BIRDGLASS · PLACEMENT SHEET</p><h1>${title}</h1><p class="summary">Glass ${number(request.widthMm)} × ${number(request.heightMm)} mm${shape ? ` bounding box · ${shape.kind === 'arch' ? 'arched top' : shape.kind === 'raked' ? 'sloped top' : 'custom outline'}` : ` · ${layout.rows} rows × ${layout.columns} columns`} · <strong>${quantities.dotCount.toLocaleString('en-MY')} dots</strong></p><p class="notice">Use the written millimetre measurements. Do not measure distances on this drawing or use it as a full-size sticking template. Confirm the glass dimensions and product instructions before installation.</p>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 360" role="img" aria-label="Measured glass layout, total width and height, with the first dot highlighted">
  <defs><pattern id="sheet-grid" patternUnits="userSpaceOnUse" x="${firstX - pitch / 2}" y="${firstY - pitch / 2}" width="${pitch}" height="${pitch}"><circle cx="${pitch / 2}" cy="${pitch / 2}" r="${radius}" fill="white"/></pattern><marker id="sheet-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L8 4L0 8" fill="none" stroke="#45673c" stroke-width="1.5"/></marker></defs>
  ${shape ? `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="none" stroke="#9fb39a" stroke-dasharray="4 3"/>` : ''}${dotsSvg}
  <g stroke="#45673c" fill="none"><path d="M${x} ${y - 22}H${x + width}" marker-start="url(#sheet-arrow)" marker-end="url(#sheet-arrow)"/><path d="M${x + width + 25} ${y}V${y + height}" marker-start="url(#sheet-arrow)" marker-end="url(#sheet-arrow)"/></g><text x="340" y="${y - 33}" text-anchor="middle">${number(request.widthMm)} mm glass width</text><text x="${x + width + 44}" y="${y + height / 2}" text-anchor="middle" transform="rotate(90 ${x + width + 44} ${y + height / 2})">${number(request.heightMm)} mm glass height</text>
  <circle cx="${firstX}" cy="${firstY}" r="5" fill="none" stroke="#efc474" stroke-width="1.8"/><path d="M${firstX - 4} ${firstY}L${x - 28} ${y - 1}" stroke="#ad792b"/><text x="${x - 34}" y="${y - 2}" text-anchor="end">First dot</text><text x="340" y="345" text-anchor="middle">10 mm white circles · 50 mm centre spacing across and down</text></svg>
  ${shape ? shapedSteps(treatment) : `  <h2>1. Locate the first dot centre</h2><div class="start"><div><span>FROM THE LEFT GLASS EDGE</span><strong>${number(first.xMm)} mm</strong><small>Measure to the centre of the first dot.</small></div><div><span>FROM THE TOP GLASS EDGE</span><strong>${number(first.yMm)} mm</strong><small>Measure to the same dot centre.</small></div></div>
  <h2>2. Repeat at fixed spacing</h2><ol><li>${horizontal}</li><li>${vertical}</li><li>Each dot is <strong>10 mm in diameter</strong>. The empty gap between neighbouring dots is <strong>40 mm</strong> wherever neighbours exist.</li></ol>
  <h2>3. Check the clear edge margins</h2><p>Measure from each glass edge to the nearest dot edge, not its centre.</p><div class="edges">${Object.entries(gaps).map(([edge, gap]) => `<div>${edge[0].toUpperCase() + edge.slice(1)} edge<strong>${number(gap)} mm</strong></div>`).join('')}</div>`}<p class="footnote">Exterior application across the selected pane. Material suitability, contrast, access and installation conditions still need site review. BG-EDGE-001 uses a 25 mm maximum clear edge gap as a BirdGlass engineering rule; it is not an independently validated ecological threshold.</p>${options.debugMode?`<p class="footnote">Guideline ${escapeHtml(request.guidelineId)} / ${escapeHtml(request.guidelineVersion)} · Algorithm ${escapeHtml(layout.algorithmVersion)}<br>Window ${escapeHtml(draft.windowId)} · dimension revision ${draft.dimensionRevision} · layout ${escapeHtml(layout.layoutVersion)}</p>`:''}</main></body></html>`;
}

export function downloadLayoutSheet(treatment: Treatment, options:ReportOptions={}) {
  const slug = (treatment.draft.label || 'window').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 50) || 'window';
  downloadBlob(new Blob([buildLayoutSheet(treatment, options)], { type: 'text/html;charset=utf-8' }), `birdglass-${slug}-placement.html`);
}
