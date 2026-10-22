import { BASELINE_GUIDELINE } from '../config/baseline';
import { buildLayoutRequest } from '../features/member2/model';
import type { WindowDraft } from '../features/member2/types';
import { calculateQuantities, validatePattern } from '../features/member3';

export type PlanEntry = { windowId: string; dimensionRevision: number; layoutVersion: string; location: string; selected?: boolean; priority?: 'high' | 'medium' | 'low'; priorityReason?: string };
export type Purchasing = { format: 'film' | 'dots'; allowance: string; unitPrice: string; dotsPerPack?: string; packPrice?: string; installationPerWindow?: string; projectCharge?: string };
export type BuildingPlan = { name: string; budget?: string; budgetEnabled?: boolean; budgetScope?: 'materials' | 'installed'; costMode?: 'catalogue' | 'legacy'; entries: PlanEntry[]; purchasing: Purchasing };
export const emptyPlan = (): BuildingPlan => ({ name: '', entries: [], purchasing: { format: 'film', allowance: '0', unitPrice: '', dotsPerPack: '', packPrice: '', installationPerWindow: '', projectCharge: '' } });

/** Public planning uses per-window costs; saved budget/legacy settings remain available in debug mode. */
export function planningViewPlan(plan: BuildingPlan, debugMode = false): BuildingPlan {
  return debugMode ? plan : { ...plan, costMode: 'catalogue', budgetEnabled: false };
}

export function treatmentFor(draft: WindowDraft) {
  if (!draft.layout) throw new Error('Generate the pattern before adding this window.');
  const request = buildLayoutRequest(draft, BASELINE_GUIDELINE);
  const check = validatePattern(draft.layout, request, BASELINE_GUIDELINE);
  if (!check.geometryPassed || !check.measurements) throw new Error('The layout needs updating. Generate the pattern again.');
  return { draft, request, check, quantities: calculateQuantities(request, draft.layout, BASELINE_GUIDELINE) };
}
export type Treatment = ReturnType<typeof treatmentFor>;
export function inspectEntry(entry: PlanEntry, windows: WindowDraft[]) {
  const draft = windows.find(window => window.windowId === entry.windowId);
  if (!draft) return { entry, draft: null, treatment: null, issue: 'Window removed' };
  try {
    const treatment = treatmentFor(draft);
    if (draft.dimensionRevision !== entry.dimensionRevision || draft.layout!.layoutVersion !== entry.layoutVersion) {
      return { entry, draft, treatment: null, issue: 'Treatment changed — update plan' };
    }
    return { entry, draft, treatment, issue: '' };
  } catch {
    return { entry, draft, treatment: null, issue: 'Measurements changed or layout unavailable — regenerate pattern' };
  }
}
export function planEntry(draft: WindowDraft, location = ''): PlanEntry {
  treatmentFor(draft);
  return { windowId: draft.windowId, dimensionRevision: draft.dimensionRevision, layoutVersion: draft.layout!.layoutVersion, location };
}
export function purchasingEstimate(settings: Purchasing, areaM2: number, dots: number, windowCount = 0) {
  const decimal = /^(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!decimal.test(settings.allowance.trim())) throw new Error('Enter an allowance from 0 to 100%.');
  if (settings.unitPrice.trim() && !decimal.test(settings.unitPrice.trim())) throw new Error('Enter a valid non-negative supplier unit price, or leave it blank.');
  const allowance = settings.allowance.trim() === '' ? NaN : Number(settings.allowance);
  const price = settings.unitPrice.trim() === '' ? null : Number(settings.unitPrice);
  if (!Number.isFinite(allowance) || allowance < 0 || allowance > 100) throw new Error('Enter an allowance from 0 to 100%.');
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Enter a valid non-negative supplier unit price, or leave it blank.');
  function optionalAmount(value: string | undefined, label: string) {
    if (!value?.trim()) return null;
    if (!decimal.test(value.trim()) || !Number.isFinite(Number(value))) throw new Error(`Enter a valid non-negative ${label}.`);
    return Number(value);
  }
  if (!Number.isFinite(areaM2) || areaM2 < 0 || !Number.isSafeInteger(dots) || dots < 0 || !Number.isSafeInteger(windowCount) || windowCount < 0) throw new Error('Invalid treatment quantities.');
  const quantity = settings.format === 'film' ? areaM2 * (1 + allowance / 100) : Math.ceil(dots + dots * allowance / 100);
  const packSize = settings.format === 'dots' ? optionalAmount(settings.dotsPerPack, 'dots per pack') : null;
  if (packSize !== null && (!Number.isSafeInteger(packSize) || packSize < 1)) throw new Error('Dots per pack must be a positive whole number.');
  const packPrice = settings.format === 'dots' ? optionalAmount(settings.packPrice, 'pack price') : null;
  const packs = packSize === null ? null : Math.ceil(quantity / packSize);
  // Old saved per-dot quotes stay separate from new pack quotes; never reinterpret them.
  const cost = quantity === 0 ? 0 : settings.format === 'film' ? (price === null ? null : quantity * price)
    : packs === null || packPrice === null ? null : packs * packPrice;
  const installationPerWindow = optionalAmount(settings.installationPerWindow, 'installation charge per window');
  const projectCharge = optionalAmount(settings.projectCharge, 'project charge');
  const installationCost = windowCount === 0 ? 0 : installationPerWindow === null || projectCharge === null ? null : installationPerWindow * windowCount + projectCharge;
  const totalCost = cost === null || installationCost === null ? null : cost + installationCost;
  const purchasedDots = packs === null ? null : packs * packSize!;
  if ([quantity, cost, packs, purchasedDots, installationCost, totalCost].some(value => value !== null && !Number.isFinite(value)) || (purchasedDots !== null && !Number.isSafeInteger(purchasedDots))) throw new Error('The estimate is too large. Check the quantities and prices.');
  return { quantity, cost, allowance, unitPrice: price, unit: settings.format === 'film' ? 'm²' : 'dots', packSize, packPrice, packs, purchasedDots, installationPerWindow, projectCharge, installationCost, totalCost, windowCount };

}
export function isBuildingPlan(value: unknown): value is BuildingPlan {
  if (!value || typeof value !== 'object') return false;
  const plan = value as BuildingPlan;
  return (plan.budgetEnabled === undefined || typeof plan.budgetEnabled === 'boolean')
    && (plan.budgetScope === undefined || ['materials','installed'].includes(plan.budgetScope))
    && (plan.costMode === undefined || ['catalogue','legacy'].includes(plan.costMode))
    && (plan.budget === undefined || (typeof plan.budget === 'string' && plan.budget.length <= 20)) && typeof plan.name === 'string' && plan.name.length <= 120 && Array.isArray(plan.entries) && plan.entries.length <= 8
    && new Set(plan.entries.map(entry => entry?.windowId)).size === plan.entries.length
    && plan.entries.every(entry => entry && typeof entry.windowId === 'string' && typeof entry.layoutVersion === 'string'
      && Number.isSafeInteger(entry.dimensionRevision) && entry.dimensionRevision >= 0 && (entry.priority === undefined || ['high', 'medium', 'low'].includes(entry.priority)) && (entry.priorityReason === undefined || (typeof entry.priorityReason === 'string' && entry.priorityReason.length <= 300)) && (entry.selected === undefined || typeof entry.selected === 'boolean') && typeof entry.location === 'string' && entry.location.length <= 120)
    && !!plan.purchasing && ['film', 'dots'].includes(plan.purchasing.format)
    && typeof plan.purchasing.allowance === 'string' && plan.purchasing.allowance.length <= 12
    && ['dotsPerPack', 'packPrice', 'installationPerWindow', 'projectCharge'].every(key => { const value = plan.purchasing[key as keyof Purchasing]; return value === undefined || (typeof value === 'string' && value.length <= 20); })
    && typeof plan.purchasing.unitPrice === 'string' && plan.purchasing.unitPrice.length <= 20;
}

export function budgetStatus(budget: string | undefined, cost: number | null, incomplete = false) {
  if (!budget?.trim()) return { amount: null, remaining: null };
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(budget.trim()) || !Number.isFinite(Number(budget))) throw new Error('Enter a valid non-negative budget.');
  const amount = Number(budget);
  return { amount, remaining: cost === null || incomplete ? null : Number((amount - cost).toFixed(2)) };
}

export function priorityRank(entry: PlanEntry) { return entry.priority === 'high' ? 3 : entry.priority === 'medium' ? 2 : entry.priority === 'low' ? 1 : 0; }
