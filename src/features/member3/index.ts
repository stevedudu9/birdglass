import type { LayoutProvider } from '../member2/types';
import { generatePattern } from './generatePattern';

export { generatePattern };
export { validatePattern } from './validatePattern';
export type { PatternCheck, PatternMeasurements } from './validatePattern';
export { calculateQuantities } from './calculateQuantities';
export type { MaterialQuantities } from './calculateQuantities';
export { ALGORITHM_VERSION } from './rules';
export { coverageLimits, SHAPED_MIN_EDGE_DOT_CLEAR_GAP_MM } from './shapedPattern';
export type { ShapedMeasurements } from './shapedPattern';
export { SHAPED_REVIEW_MESSAGE } from './validatePattern';
export { gridMetrics, measurementSensitivity, paneLimitMessage } from './grid';

export const calculateLayout: LayoutProvider = async (request, guideline) => generatePattern(request, guideline);
