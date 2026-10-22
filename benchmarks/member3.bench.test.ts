import { expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { BASELINE_GUIDELINE as guideline } from '../src/config/baseline';
import { generatePattern, validatePattern } from '../src/features/member3';
import { projectDots } from '../src/features/member2/geometry';
import { validateLayout } from '../src/features/member2/validation';
import type { WindowInput } from '../src/features/member2/types';

it('measures complete generation, both validators and perspective projection', () => {
  const corners = { tl: { u: .1, v: .1 }, tr: { u: .9, v: .15 }, br: { u: .85, v: .9 }, bl: { u: .15, v: .85 } };
  const results = [];
  // Independent known counts: one warm-up and three measured runs per supported pane.
  const cases = [[4000, 2500, 4000], [3000, 4000, 4800], [5000, 5000, 10000]];
  for (const [widthMm, heightMm, expectedCount] of cases) {
    const request = { windowId: 'benchmark', dimensionRevision: 0, widthMm, heightMm, guidelineId: guideline.id, guidelineVersion: guideline.version };
    const input: WindowInput = { ...request, schemaVersion: '0.1', buildingId: 'benchmark', label: 'Benchmark', imageId: 'benchmark', imageWidthPx: 1280, imageHeightPx: 900, imageOrientationNormalized: true, cornersNorm: corners, photoRevision: 0 };
    const timings: number[] = [];
    let completedRuns = 0;
    for (let repeat = 0; repeat < 4; repeat++) {
      const start = performance.now();
      const layout = generatePattern(request, guideline);
      const member3Check = validatePattern(layout, request, guideline);
      const member2Check = validateLayout(layout, input, guideline);
      const projected = projectDots(layout.dotsMm, 10, widthMm, heightMm, corners);
      const elapsedMs = performance.now() - start;

      // Assertions are outside the timing; errors must fail the test, never become a result row.
      expect(layout.dotCount).toBe(expectedCount);
      expect(layout.dotsMm).toHaveLength(expectedCount);
      expect(member3Check.geometryPassed).toBe(true);
      expect(member2Check.geometryPassed).toBe(true);
      expect(projected).toHaveLength(expectedCount);
      completedRuns++;
      if (repeat) timings.push(elapsedMs);
    }
    expect(completedRuns).toBe(4);
    expect(timings).toHaveLength(3);
    results.push({ widthMm, heightMm, count: expectedCount, completedRuns, measuredRuns: timings.length, medianMs: Number(timings.sort((a, b) => a - b)[1].toFixed(2)) });
  }
  expect(results).toHaveLength(cases.length);
  console.log('BIRDGLASS_PIPELINE_BENCHMARK ' + JSON.stringify(results));
  writeFileSync('benchmarks/latest-results.json', JSON.stringify(results, null, 2));
});
