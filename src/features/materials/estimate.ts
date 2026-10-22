import { installationEstimate } from './installation';
import { findMaterial, SQFT_PER_SQM } from '../../config/materialCatalog';
import type { MaterialOption } from '../../config/materialCatalog';
import { glassAreaMm2, readDimensions } from '../member2/model';
import type { WindowDraft } from '../member2/types';
import type { MaterialOverrides } from './types';
import type { BuildingPlan } from '../../demo/planning';
import { budgetStatus, inspectEntry, purchasingEstimate } from '../../demo/planning';
import { effectiveScreening } from '../screening/assessment';
import { costSettingActive, optionalCost } from './costSettings';
export { optionalCost } from './costSettings';

export function estimateMaterial(draft: WindowDraft, material: MaterialOption | undefined = findMaterial(draft.material?.materialId)) {
  const dimensions = readDimensions(draft.dimensions);
  // Shaped panes are priced on actual glass area; cutting waste belongs in the allowance.
  const areaSqm = glassAreaMm2(draft) / 1_000_000, areaSqft = areaSqm * SQFT_PER_SQM;
  const settings: MaterialOverrides = draft.material?.overrides ?? {};
  const read = (key: keyof MaterialOverrides, label: string) => costSettingActive(draft.material, material, key) ? optionalCost(settings[key], label) : null;
  const customRate = read('unitPrice','custom unit price');
  const allowance = read('allowancePercent','material allowance') ?? 0;
  if (allowance > 100) throw new Error('Enter a material allowance from 0 to 100%.');
  const minimumOverride = read('minimumOrderCharge','minimum material charge');
  const installationQuote = read('installationQuote','installation quotation');
  const minimumLabour=read('minimumLabourCharge','minimum labour charge');
  const mobilisation=read('mobilisationCharge','mobilisation charge');
  const access=read('accessQuote','access quotation');
  const delivery = read('deliveryCharge','delivery charge'), other = read('otherCosts','other project costs');
  const areaModel = material?.pricingModel === 'PER_SQFT' || material?.pricingModel === 'PER_SQM';
  // A custom number cannot turn a pack/linear/quote-only product into an area-priced film.
  const rate = areaModel ? customRate ?? material?.unitPrice ?? null : null;
  const measuredQuantity = material?.pricingModel === 'PER_SQFT' ? areaSqft : areaSqm;
  const withAllowance = measuredQuantity * (1 + allowance / 100);
  const chargeableQuantity = areaModel ? Math.max(withAllowance,material.minimumArea ?? 0) : null;
  const minimumCharge = minimumOverride ?? material?.minimumCharge ?? null;
  const baseCost = rate === null || chargeableQuantity === null ? null : chargeableQuantity * rate;
  const materialCost = baseCost === null ? null : Math.max(baseCost,minimumCharge ?? 0);
  const installation=installationEstimate(draft.material,material,areaSqft,{quote:installationQuote,minimum:minimumLabour,mobilisation,access});
  const installationCost=installation.labourCost;
  const indicativeSubtotal=materialCost===null||installationCost===null?null:materialCost+installationCost;
  const preliminaryKnownSubtotal=(materialCost??0)+(installationCost??0);
  const knownExtras=(delivery??0)+(other??0)+(mobilisation??0)+(installation.accessCost??0);
  // Kept for budget integration: null while required labour or access is missing.
  // This is a scoped planning total, never a final installed quotation.
  const installedCost=indicativeSubtotal===null||installation.missingComponents.length?null:indicativeSubtotal+knownExtras;
  if ([areaSqm,areaSqft,chargeableQuantity,materialCost,installedCost].some(value=>value!==null&&!Number.isFinite(value))) throw new Error('The estimate is too large. Check the dimensions and prices.');
  return {dimensions,areaSqm,areaSqft,material:material ?? null,rate,referenceRate:material?.unitPrice ?? null,
    unit:material?.pricingModel === 'PER_SQFT' ? 'sq ft' : 'm²',chargeableQuantity,allowance,baseCost,minimumCharge,
    materialCost,installationCost,installation,indicativeSubtotal,preliminaryKnownSubtotal,delivery,other,knownExtras,installedCost,hasCustomRate:customRate!==null,
    hasOverrides:Object.values(settings).some(value=>!!value?.trim()),
    compatibilityWarning:material?.patternCompatibility==='different-system' ? 'This treatment uses a different system. The dot preview does not represent the selected product.'
      :material?.category==='frosted' ? 'Frosted finish differs from the white-dot preview. Confirm contrast and fabrication; the RM7 reference excludes the white-print upgrade.'
      :material ? 'Custom pattern production, exterior suitability and product performance still need supplier confirmation.' : null};
}
export function tryMaterialEstimate(draft: WindowDraft) {
  try { return {estimate:estimateMaterial(draft),error:''}; }
  catch(error) { return {estimate:null,error:(error as Error).message}; }
}
export function projectEstimate(windows: WindowDraft[], plan: BuildingPlan) {
  const rows=plan.entries.filter(entry=>entry.selected!==false).map(entry=>inspectEntry(entry,windows));
  const valid=rows.flatMap(row=>row.treatment?[row.treatment]:[]),stale=valid.length!==rows.length;
  const estimates=valid.map(item=>tryMaterialEstimate(item.draft));
  const knownMaterialSubtotal=estimates.reduce((sum,row)=>sum+(row.estimate?.materialCost??0),0);
  let unknownMaterialCount=rows.length-estimates.filter(row=>row.estimate?.materialCost!==null&&row.estimate?.materialCost!==undefined).length;
  let unknownInstallationCount=rows.length-estimates.filter(row=>row.estimate?.installationCost!==null&&row.estimate?.installationCost!==undefined).length;
  const unknownAccessCount=estimates.filter(row=>row.estimate?.installation.accessRequired&&row.estimate.installation.accessCost===null).length;
  let knownLabourSubtotal=estimates.reduce((sum,row)=>sum+(row.estimate?.installationCost??0),0);
  const materialSubtotal=unknownMaterialCount?null:knownMaterialSubtotal;
  const installationSubtotal=unknownInstallationCount?null:estimates.reduce((sum,row)=>sum+row.estimate!.installationCost!,0);
  const extras=estimates.reduce((sum,row)=>sum+(row.estimate?.knownExtras??0),0);
  let installedTotal=materialSubtotal===null||installationSubtotal===null||unknownAccessCount?null:materialSubtotal+installationSubtotal+extras;
  let indicativeSubtotal=materialSubtotal===null||installationSubtotal===null?null:materialSubtotal+installationSubtotal;
  let cost=materialSubtotal,knownCost=knownMaterialSubtotal,installation=installationSubtotal,error='';
  if(plan.costMode==='legacy') {
    try {
      const legacy=purchasingEstimate(plan.purchasing,valid.reduce((sum,item)=>sum+item.quantities.windowAreaM2,0),valid.reduce((sum,item)=>sum+item.quantities.dotCount,0),valid.length);
      cost=stale?null:legacy.cost;knownCost=legacy.cost??0;installation=stale?null:legacy.installationCost;installedTotal=stale||unknownAccessCount?null:legacy.totalCost;
      knownLabourSubtotal=legacy.installationCost??0;indicativeSubtotal=cost===null||installation===null?null:cost+installation;
      unknownMaterialCount=cost===null?rows.length:0;unknownInstallationCount=installation===null?rows.length:0;
    }catch(reason){cost=null;installation=null;installedTotal=null;error=(reason as Error).message;}
  }
  return {rows,valid,stale,estimates,knownMaterialSubtotal:knownCost,materialSubtotal:cost,installationSubtotal:installation,installedTotal,
    unknownMaterialCount,unknownInstallationCount,unknownAccessCount,indicativeSubtotal,knownLabourSubtotal,knownPreliminarySubtotal:knownCost+knownLabourSubtotal,extras,error,areaSqm:valid.reduce((sum,item)=>sum+item.quantities.windowAreaM2,0)};
}
/** Transparent priority-first greedy suggestion; never changes ecological recommendations. */
export function budgetSuggestion(windows:WindowDraft[],plan:BuildingPlan) {
  const budget=budgetStatus(plan.budget,0).amount;
  if(budget===null)throw new Error('Enter an optional budget before applying a suggestion.');
  if(plan.costMode==='legacy')throw new Error('Use catalogue estimates for per-window budget suggestions; the saved project quotation shares packs and fees.');
  const ranked=plan.entries.map(entry=>({entry,draft:windows.find(item=>item.windowId===entry.windowId)}))
    .sort((a,b)=>({high:4,review:3,medium:2,lower:1}[b.draft?effectiveScreening(b.draft,b.entry).effective:'review'])-({high:4,review:3,medium:2,lower:1}[a.draft?effectiveScreening(a.draft,a.entry).effective:'review']));
  let spent=0;const selected:string[]=[],unknown:string[]=[];
  for(const {entry,draft} of ranked){
    const current=inspectEntry(entry,windows);
    const estimate=draft&&current.treatment?tryMaterialEstimate(draft).estimate:null;
    const cost=plan.budgetScope==='materials'?estimate?.materialCost:estimate?.installedCost;
    if(cost===null||cost===undefined){unknown.push(draft?.label||'Removed window');continue;}
    if(spent+cost<=budget+1e-9){selected.push(entry.windowId);spent+=cost;}
  }
  return {selected,unknown,spent};
}
