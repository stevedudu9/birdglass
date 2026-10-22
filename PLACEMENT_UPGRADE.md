# Member 3 placement and large-pane upgrade

Completed 16 October 2026. Algorithm version: `member3-fixed-grid-1.1.0`. Guideline version remains `2026-10-15.2`; dot size, fixed spacing and BG-EDGE-001 are unchanged.

## User additions

- **Download placement sheet:** produces a self-contained printable HTML reference with the measured width/height, highlighted first dot, centre offsets, rows, columns, repeat spacing and four clear margins. It includes Print / Save as PDF. The drawing is explicitly not to scale and is not a full-size sticking template.
- **First-dot measurements:** shown within spacing and edge checks. For 1200 × 1500 mm, the first dot centre is 25 mm from the left and top edges, while the clear margins are 20 mm. Every neighbouring centre stays 50 mm apart.
- **Measurement variation:** an optional scenario accepts a ± mm value for both dimensions and reports minimum/maximum counts and the next row/column thresholds. It does not estimate measurement accuracy or claim an installation tolerance. For width 1260 mm and height 1500 mm, ±1 mm gives 750–780 dots.
- **Large panes:** supports up to 10,000 dots per pane, including a 5000 × 5000 mm, 100 × 100 grid. Oversized panes are blocked before generation with their expected count and a prompt to check units and the actual pane selection. A 6000 × 5000 mm pane needs 12,000 dots and exceeds this software limit.

## Implementation and integration

`gridMetrics` provides constant-size metadata before any dot allocation; `measurementSensitivity` evaluates count thresholds. The existing `LayoutResult` still includes every physical dot centre for Member 2 and Member 1. No request/response schema or coordinate convention changed.

Both validators use binary searches on their independently measured sorted coordinates. Projection reuses the same 48 physical circle offsets across all dots, preserving the existing outline detail. The flat-grid diagram uses one SVG tile rather than thousands of DOM circles. Result validation is memoized against the immutable window record; building-plan validation is not repeated just because a material quote changes.

The shared limit in `src/features/member2/model.ts` and parser/validators must be merged with Member 3. Do not raise only the generator limit. The updated core package includes the three coordinated Member 2 support files. Its README explains the merge. The full demo additionally contains `layoutSheet.ts`, `MeasurementCheck.tsx`, `html.ts`, results/editor changes and their UI styles.

Existing valid layouts remain readable. Regenerating creates a new layout version, so any selected building-plan entry must be explicitly updated. The app retains its stale-plan export guard.

## Verification

All **126 tests in 15 files**, TypeScript checking and the production build passed. Tests cover centre-versus-edge offsets, exact count thresholds, stable counts with changing offsets, invalid scenarios, 10,000-dot geometry through both validators, tolerance lookup, stale export rejection, escaped labels, compact output and actionable capacity warnings. The suite includes the pipeline benchmark.

The benchmark warms each supported case once and takes the median of three repetitions of generation, both validators and 48-point perspective projection. In the recorded `Member3-performance-after.json` run on this machine:

| Pane | Dots | Median pipeline time |
|---|---:|---:|
| 4000 × 2500 mm | 4000 | 29.26 ms |
| 3000 × 4000 mm | 4800 | 31.81 ms |
| 5000 × 5000 mm | 10000 | 84.05 ms |

These are local measurements, not speed guarantees. The before/after runs are too small and subject to machine load to claim a precise speedup. Browser rendering and report download are not included in these timings. The previous code rejected the latter two sizes.

Browser verification confirmed the 10,000-dot photo preview, one-circle tiled flat grid, the 12,000-dot warning, the 750–780 sensitivity scenario, successful placement-sheet download and the restored 720-dot sample with an updated plan entry. The exported reference was visually checked. Screen-size checks do not establish performance on a physical phone or verify field installation.

The original Downloads project remains separate. All integrated changes are in the review copy and delivered demo/package.
