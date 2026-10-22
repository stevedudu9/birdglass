import { INSTALLATION_METHODS } from '../../config/installation';
import type { InstallationMethodId } from '../../config/installation';
export type MaterialOverrides = {
  unitPrice?: string; allowancePercent?: string; installationQuote?: string;
  minimumOrderCharge?: string; deliveryCharge?: string; otherCosts?: string;
  minimumLabourCharge?: string; mobilisationCharge?: string; accessQuote?: string;
};
export type MaterialSelection = { materialId: string; overrides?: MaterialOverrides; installationMethod?: InstallationMethodId; useInstallationQuote?: boolean };
export const OVERRIDE_KEYS = ['unitPrice','allowancePercent','installationQuote','minimumOrderCharge','deliveryCharge','otherCosts','minimumLabourCharge','mobilisationCharge','accessQuote'] as const;
export function isMaterialSelection(value: unknown): value is MaterialSelection {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as MaterialSelection;
  return typeof item.materialId === 'string' && item.materialId.length > 0 && item.materialId.length <= 100
    && (item.installationMethod === undefined || INSTALLATION_METHODS.some(method=>method.id===item.installationMethod))
    && (item.useInstallationQuote === undefined || typeof item.useInstallationQuote === 'boolean')
    && (item.overrides === undefined || (!!item.overrides && typeof item.overrides === 'object' && !Array.isArray(item.overrides)
      && OVERRIDE_KEYS.every(key => item.overrides?.[key] === undefined || (typeof item.overrides[key] === 'string' && item.overrides[key]!.length <= 20))));
}
