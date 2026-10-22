import type { Treatment, BuildingPlan } from '../../demo/planning';
import { budgetStatus, planEntry } from '../../demo/planning';
import { escapeHtml } from '../../demo/html';
import { ESTIMATE_NOTE, MARKET_DISCLAIMER, PRICING_LABELS } from '../../config/materialCatalog';
import { projectEstimate, tryMaterialEstimate } from './estimate';
const money=(value:number|null)=>value===null?'Unavailable':`RM ${value.toFixed(2)}`;
const n=(value:number)=>value.toLocaleString('en-MY',{maximumFractionDigits:4});
export function materialReport(treatment:Treatment) {
  const {estimate,error}=tryMaterialEstimate(treatment.draft);
  if(!estimate)return `<section><h3>Estimated Treatment Cost</h3><p>Unavailable: ${escapeHtml(error)}</p></section>`;
  const item=estimate.material, installation=estimate.installation;
  return `<section><h3>Estimated Treatment Cost</h3><p>Indicative Market Estimate · material and labour planning.</p><table><tbody>
  <tr><th>Selected treatment</th><td>${escapeHtml(item?.name??'No current material selected')}</td></tr>
  <tr><th>Glass area</th><td>${n(estimate.areaSqm)} m² / ${n(estimate.areaSqft)} sq ft</td></tr>
  <tr><th>Pattern check status</th><td>${escapeHtml(treatment.check.status)}. ${treatment.check.geometryPassed?'Pattern passes configured geometric checks.':''} Product suitability is a separate review.</td></tr>
  <tr><th>Market reference</th><td>${money(estimate.referenceRate)}${estimate.referenceRate===null?'':` / ${estimate.unit}`} · ${item?PRICING_LABELS[item.pricingStatus]:'Price unavailable'}</td></tr>
  <tr><th>Estimated material quantity</th><td>${estimate.chargeableQuantity===null?'Supplier quotation required':`${n(estimate.chargeableQuantity)} ${estimate.unit}`} · allowance ${n(estimate.allowance)}%</td></tr>
  <tr><th>Indicative material cost</th><td>${money(estimate.materialCost)}</td></tr>
  <tr><th>Installation method</th><td>${escapeHtml(installation.label)} · ${escapeHtml(installation.basis)}</td></tr>
  <tr><th>Reference labour rate</th><td>${installation.referenceRate===null?installation.diy?'RM 0.00 professional labour':'No defensible area rate for this method/material':`${money(installation.referenceRate)} / sq ft`}${installation.usesQuote?' — replaced by the entered labour quotation':''}</td></tr>
  <tr><th>Estimated installation labour</th><td>${estimate.installationCost===null?'Unavailable — installation quotation required':money(estimate.installationCost)}${installation.rate===null?'':` · ${n(estimate.areaSqft)} sq ft × ${money(installation.rate)}/sq ft`}. ${installation.minimumLabourCharge===null?'No minimum labour charge entered.':`Minimum labour charge ${money(installation.minimumLabourCharge)}${installation.diy?' (not applied to DIY)':''}.`}</td></tr>
  <tr><th>Indicative material + labour subtotal</th><td>${estimate.indicativeSubtotal===null?`Incomplete; known material/labour costs ${money(estimate.preliminaryKnownSubtotal)}`:money(estimate.indicativeSubtotal)}. Additional charges are separate.</td></tr>
  <tr><th>Additional charges</th><td>Mobilisation ${installation.mobilisationCharge===null?'not entered':money(installation.mobilisationCharge)}; delivery ${estimate.delivery===null?'not entered':money(estimate.delivery)}; other ${estimate.other===null?'not entered':money(estimate.other)}. ${installation.accessRequired?`High-rise / difficult access: ${installation.accessCost===null?'unpriced — not included':money(installation.accessCost)}.`:'Specialist access is excluded from standard film labour.'} Unquoted artwork, tax and equipment are excluded.</td></tr>
  <tr><th>Planning scope including entered charges</th><td>${estimate.installedCost===null?'Incomplete — required labour or access component unpriced':money(estimate.installedCost)}. Not a binding final installed quotation.</td></tr>
  ${estimate.hasOverrides?`<tr><th>User-entered quotation / assumption</th><td>Effective rate ${money(estimate.rate)} / ${estimate.unit}. Reference price retained above. Minimum material charge ${money(estimate.minimumCharge)}; delivery ${money(estimate.delivery)}; other costs ${money(estimate.other)}.</td></tr>`:''}
  </tbody></table>${item?.sourceUrl?`<p>Price reference: <a href="${escapeHtml(item.sourceUrl)}">${escapeHtml(item.supplierReference??'Supplier reference')}</a> · checked ${escapeHtml(item.sourceCheckedDate??'Not verified')}</p>`:''}
  <p>Installation assumptions: ${escapeHtml(installation.assumption)}</p>${installation.reference?`<p>Labour source: <a href="${escapeHtml(installation.reference.sourceUrl)}">${escapeHtml(installation.reference.sourceTitle)}</a> · checked ${installation.reference.checkedDate}. Published installation reference RM2.50–RM5.00/sq ft; the selected planning rate is an assumption, not a supplier quotation.</p>`:''}
  ${estimate.compatibilityWarning?`<p class="review">${escapeHtml(estimate.compatibilityWarning)}</p>`:''}
  ${item?`<ul>${item.limitations.map(text=>`<li>${escapeHtml(text)}</li>`).join('')}</ul>`:'<p>Select a material to obtain an indicative estimate.</p>'}
  <p>${MARKET_DISCLAIMER}</p><p>${ESTIMATE_NOTE}</p></section>`;
}
export function projectCostReport(treatments:Treatment[],plan:BuildingPlan) {
  // The export contains only selected current treatments; do not price stale or removed panes.
  const exportPlan={...plan,entries:treatments.map(item=>plan.entries.find(entry=>entry.windowId===item.draft.windowId)??planEntry(item.draft))};
  const totals=projectEstimate(treatments.map(item=>item.draft),exportPlan);
  const budget=budgetStatus(plan.budgetEnabled?plan.budget:undefined,plan.budgetScope==='materials'?totals.materialSubtotal:totals.installedTotal);
  return `<section><h2>Project cost estimate</h2><p>${totals.materialSubtotal===null?'Known material subtotal (partial)':'Estimated material total'}: <strong>${money(totals.knownMaterialSubtotal)}</strong>.</p>
  ${totals.materialSubtotal===null?`<p>${totals.unknownMaterialCount} selected windows need material prices or current layouts; their costs are not zero.</p>`:''}
  <p>Estimated installation labour: ${money(totals.installationSubtotal)}. Indicative material + labour subtotal: ${totals.indicativeSubtotal===null?`Incomplete; known costs ${money(totals.knownPreliminarySubtotal)}`:money(totals.indicativeSubtotal)}. Additional entered charges: ${money(totals.extras)}.</p><p>Planning scope including entered charges: ${totals.installedTotal===null?'Incomplete — required labour or access component unpriced':money(totals.installedTotal)}. ${totals.unknownAccessCount?`${totals.unknownAccessCount} selected windows have unpriced high-rise / difficult-access costs.`:''} Not a binding final installed quotation.</p>
  ${plan.budgetEnabled?`<p>Optional budget: ${money(budget.amount)}. Basis: ${plan.budgetScope==='materials'?'Materials only; installation excluded':'Materials, estimated labour and entered charges'}. ${budget.remaining===null?'Budget feasibility unavailable while required costs are unknown.':budget.remaining<0?`Over budget by ${money(-budget.remaining)}.`:`Budget remaining: ${money(budget.remaining)}.`}</p>`:''}
  <p><strong>Exclusions:</strong> Unentered mobilisation, delivery, custom artwork, tax, equipment, and specialist high-rise access charges are excluded from this indicative planning subtotal.</p>
  <p>${ESTIMATE_NOTE}</p></section>`;
}
