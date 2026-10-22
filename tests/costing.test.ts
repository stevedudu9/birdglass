import { expect, it } from 'vitest';
import { budgetStatus, emptyPlan, isBuildingPlan, purchasingEstimate } from '../src/demo/planning';

it('compares budgets, blocks incomplete comparisons and validates saved selection', () => {
  expect(budgetStatus('100', 135).remaining).toBe(-35);
  expect(budgetStatus('135', 135).remaining).toBe(0);
  expect(budgetStatus('200', 135).remaining).toBe(65);
  expect(budgetStatus('200', null).remaining).toBeNull();
  expect(budgetStatus('200', 10, true).remaining).toBeNull();
  expect(() => budgetStatus('-1', 0)).toThrow();
  expect(isBuildingPlan({ ...emptyPlan(), budget: 100 })).toBe(false);
});

it('shares packs across windows and includes allowance and installation', () => {
  const settings = { ...emptyPlan().purchasing, format: 'dots' as const, allowance: '10', dotsPerPack: '500', packPrice: '20', installationPerWindow: '15', projectCharge: '30' };
  const result = purchasingEstimate(settings, 2.7, 1080, 3);
  expect(result).toMatchObject({ quantity: 1188, packs: 3, purchasedDots: 1500, cost: 60, installationCost: 75, totalCost: 135 });
  expect(purchasingEstimate({ ...settings, allowance: '0' }, 2, 600, 2).packs).toBe(2);
  expect(purchasingEstimate({ ...settings, allowance: '0' }, 2, 1000, 2).packs).toBe(2);
});
it('keeps missing quotes unknown and never reinterprets legacy dot prices', () => {
  const settings = { format: 'dots' as const, allowance: '0', unitPrice: '0.04' };
  expect(purchasingEstimate(settings, 1, 400, 1).cost).toBeNull();
  expect(purchasingEstimate({ ...settings, dotsPerPack: '500', packPrice: '20' }, 1, 400, 1).totalCost).toBeNull();
  expect(isBuildingPlan({ ...emptyPlan(), purchasing: settings })).toBe(true);
  expect(isBuildingPlan({ ...emptyPlan(), purchasing: { ...settings, packPrice: 20 } })).toBe(false);
});
it('handles explicit free installation, film quotes and an empty building', () => {
  const settings = { ...emptyPlan().purchasing, unitPrice: '100', installationPerWindow: '0', projectCharge: '0' };
  expect(purchasingEstimate(settings, 1.8, 720, 1).totalCost).toBe(180);
  expect(purchasingEstimate({ ...settings, projectCharge: '50' }, 0, 0, 0).totalCost).toBe(0);
});
it('rejects fractional pack sizes, malformed prices and overflow', () => {
  const settings = { ...emptyPlan().purchasing, format: 'dots' as const, dotsPerPack: '500', packPrice: '20' };
  for (const dotsPerPack of ['0', '1.5', '-5', 'NaN']) expect(() => purchasingEstimate({ ...settings, dotsPerPack }, 1, 400, 1)).toThrow();
  expect(() => purchasingEstimate({ ...settings, installationPerWindow: '-1' }, 1, 400, 1)).toThrow();
  expect(() => purchasingEstimate({ ...settings, packPrice: '9'.repeat(309) }, 1, 400, 1)).toThrow();
});
