import type { MaterialOption } from '../../config/materialCatalog';
import type { MaterialOverrides, MaterialSelection } from './types';

export function optionalCost(value: string | undefined, label: string): number | null {
  if (!value?.trim()) return null;
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()) || !Number.isFinite(Number(value))) {
    throw new Error(`Enter a valid non-negative ${label}.`);
  }
  return Number(value);
}

/** Retain inactive saved values without letting them affect another installation method. */
export function costSettingActive(selection: MaterialSelection | undefined, material: MaterialOption | undefined, key: keyof MaterialOverrides): boolean {
  if (!selection) return false;
  if (['unitPrice', 'allowancePercent', 'minimumOrderCharge'].includes(key)) {
    return material?.pricingModel === 'PER_SQFT' || material?.pricingModel === 'PER_SQM';
  }
  if (key === 'accessQuote') return selection.installationMethod === 'difficult-access';
  if (key === 'installationQuote') return selection.installationMethod !== 'diy' && selection.useInstallationQuote !== false;
  if (key === 'minimumLabourCharge') return selection.installationMethod !== 'diy' && (material?.installationIncluded !== true || (selection.useInstallationQuote !== false && !!selection.overrides?.installationQuote?.trim()));
  return true;
}

export function costSettingError(value: string | undefined, key: keyof MaterialOverrides, label: string): string {
  try {
    const amount = optionalCost(value, label);
    if (key === 'allowancePercent' && amount !== null && amount > 100) return 'Enter a material allowance from 0 to 100%.';
    return '';
  } catch (error) { return (error as Error).message; }
}
