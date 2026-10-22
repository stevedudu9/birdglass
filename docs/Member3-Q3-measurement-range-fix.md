# Q3 — unsupported measurement-variation ranges

Resolved 16 October 2026 in the Member 3 helper and complete integrated Demo.

Previously, an unsupported endpoint made `countChanges` true, even when the full-range comparison was unavailable. For example, a 10 × 10 mm pane with ±1 mm includes 9 × 9 mm, below the software's supported minimum. The page nevertheless claimed the dot count could change.

`measurementSensitivity` now returns `countChanges: null` when either endpoint is unsupported. It returns true or false only when both endpoints can be calculated. Callers must explicitly handle null as an unknown full-range comparison. The nominal result and any supported endpoint are preserved; missing endpoints are not clamped or treated as zero dots. The existing preview-capacity flag remains separate from dimension support.

The page now says **Cannot calculate the full range.** It explains the supported 10–100,000 mm dimensions and asks the user to reduce the variation or check the measured dimensions. Unsupported ranges show neither the count-changes claim nor the count-stays-the-same claim. Supported ranges retain their count summary and starting-offset explanation.

Nine added regression cases cover lower and upper limits on either axis, both endpoints unsupported, inclusive endpoints, zero variation and recovery to a supported range. Eight of those cases failed before the fix. Afterwards, all **141 tests in 15 files**, TypeScript checking and the production build passed.

Browser verification used the existing 1200 × 1500 mm example: ±1 mm keeps 720 dots, ±20 mm gives 720–775 dots, and ±1200 mm produces the unsupported-range message. The scenario was restored to ±1 mm afterwards; window measurements and saved patterns were unchanged.

Changed application files: `src/features/member3/grid.ts` and `src/demo/MeasurementCheck.tsx`. Regression tests are in `tests/member3-additions.test.ts` and `tests/member3-additions-ui.test.tsx` in the complete Demo. The small module ZIP includes the updated helper; the full Demo includes all UI and regression-test changes. Physical pattern rules, layout records and algorithm version remain unchanged.

Remaining work: real-window checks, mobile/large-export stress testing and final team review of guideline, product and installation applicability.
