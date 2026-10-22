import { LIMITS } from '../member2/model';

/** Constant-size grid metadata: no dot array or perspective preview is allocated. */
export function gridMetrics(widthMm: number, heightMm: number) {
  for (const [name, value] of [['Width', widthMm], ['Height', heightMm]] as const) {
    if (!Number.isFinite(value) || value < 10 || value > LIMITS.dimensionMm) throw new Error(`${name} must be from 10 to 100,000 mm to fit complete 10 mm dots. Check the measured glass size and unit.`);
  }
  const columns = Math.floor((widthMm - 10) / 50) + 1;
  const rows = Math.floor((heightMm - 10) / 50) + 1;
  const startXmm = (widthMm - (columns - 1) * 50) / 2;
  const startYmm = (heightMm - (rows - 1) * 50) / 2;
  return { columns, rows, dotCount: rows * columns, startXmm, startYmm, clearLeftMm: startXmm - 5, clearTopMm: startYmm - 5,
    nextColumnAtWidthMm: columns * 50 + 10, nextRowAtHeightMm: rows * 50 + 10 };
}

export function measurementSensitivity(widthMm: number, heightMm: number, variationMm: number) {
  if (!Number.isFinite(variationMm) || variationMm < 0 || variationMm > LIMITS.dimensionMm) throw new Error('Enter a measurement variation from 0 to 100,000 mm.');
  const nominal = gridMetrics(widthMm, heightMm);
  const withinBounds = (width: number, height: number) => width >= 10 && height >= 10 && width <= LIMITS.dimensionMm && height <= LIMITS.dimensionMm;
  const low = withinBounds(widthMm - variationMm, heightMm - variationMm) ? gridMetrics(widthMm - variationMm, heightMm - variationMm) : null;
  const high = withinBounds(widthMm + variationMm, heightMm + variationMm) ? gridMetrics(widthMm + variationMm, heightMm + variationMm) : null;
  // Missing endpoints make the full-range comparison unknown, not a confirmed change.
  return { nominal, low, high, countChanges: low && high ? low.dotCount !== high.dotCount : null,
    exceedsPreviewLimit: !!high && high.dotCount > LIMITS.dots };
}

export function paneLimitMessage(dotCount: number) {
  return `This pane needs ${dotCount.toLocaleString('en-MY')} dots, above the ${LIMITS.dots.toLocaleString('en-MY')}-dot preview limit. Check the units and select one actual glass pane. If those measurements are correct, this pane exceeds the current preview capacity.`;
}
