# Member 3 baseline handover

## Message to share with the team

We have adopted guideline version `2026-10-15.2`: 10 mm white circular dots, fixed 50 × 50 mm centre spacing, and a centred complete grid with equal opposite margins. Each glass-edge-to-dot-edge clear gap must be at most 25 mm under BirdGlass policy BG-EDGE-001. This perimeter value is our engineering convention derived from the grid geometry; it is not an externally prescribed or independently tested ecological threshold.

The code, validators, research record and demo are updated. The existing TypeScript interfaces are unchanged. For a 1200 × 1500 mm pane, the result is 30 rows × 24 columns = 720 dots, with 20 mm clear margins on all sides. Verification: 158 tests passed in the complete integrated demo and the production build passed. Overall validation remains incomplete pending final guideline, material and installation applicability review.

## Integration actions

- **Member 1:** Integrate `src/features/member3/` and both supplied configuration files together. Keep guideline IDs, dimension revisions and layout versions with cost estimates. Regenerate layouts saved under the previous guideline version; never relabel an old result. Use pane area and supplier purchasing rules for full-sheet film estimates.
- **Member 2:** Keep the current millimetre TL-origin coordinates and perspective mapping. Use the supplied `calculateLayout` provider. No shared type changes are needed. Allow the guideline-version check to invalidate stale previews.
- **Member 4:** Review `BOUNDARY_POLICY.md` and remaining material/installation applicability. Attribute 25 mm to BirdGlass, rather than FLAP, Toronto or CSA. Record any new boundary evidence with the exact measurement definition and source passage.
- **Member 5:** Show measured edge gaps alongside the 25 mm project limit. Describe the result as a planning preview. Explain the remaining review status without suggesting field certification or a guaranteed collision reduction.

## Files to use

- `BirdGlass-Member3.zip`: reusable module, two configuration files, tests, integration contract and research record. Follow its README to connect the provider in the existing app.
- `BirdGlass-Member3-Demo.zip`: complete runnable demonstration. Extract fully, double-click `Start-Member3-Demo.cmd`, then open `http://127.0.0.1:5183/`. Node.js is required. See `START_HERE.md` for the demonstration script.

The earlier Downloads project remains separate. These packages contain the integrated Member 3 work.

## Placement and capacity update — 16 October 2026

Algorithm member3-fixed-grid-1.1.0 adds grid metadata and measurement-scenario helpers. The complete demo adds a dimensioned placement-sheet export and scenario controls. The shared preview capacity is now 10,000 dots; merge the supplied Member 2 model, validation and geometry updates with Member 3. Guideline 2026-10-15.2 and all physical pattern rules remain unchanged. See PLACEMENT_UPGRADE.md.

## Q1 placement correction — 16 October 2026

The full Demo now derives the starting dot from validated geometry instead of dot-array ordering. Reversed and shuffled imports keep identical starting offsets, diagrams and placement sheets. The 1200 × 1500 mm fixture still starts at (25, 25) mm with 20 mm clear margins. All 132 integrated tests and the production build pass. The algorithm version and integration contract are unchanged. Q2 benchmark error handling was subsequently fixed; see the Q2 update below. The correction is in src/demo/Member3Results.tsx and src/demo/layoutSheet.ts, with regression tests in the full Demo.

## Q2 benchmark correction — 16 October 2026

The full Demo benchmark now fails on unexpected errors or rejected checks. All three supported cases must complete four runs with known counts of 4000, 4800 and 10000 dots; assertion overhead is excluded from timing. Five injected fault scenarios now correctly fail. The normal integrated suite passes 132 tests in 15 files; TypeScript and the production build pass. No webpage or pattern changes are included. See docs/Member3-Q2-benchmark-fix.md in the complete Demo. The small module ZIP does not include the demo benchmark.

## Q3 measurement-range correction — 16 October 2026

The helper measurementSensitivity now returns countChanges: null when an endpoint exceeds supported dimensions. Handle null as an unavailable full-range comparison; true and false apply only when both endpoints are supported. The Demo shows Cannot calculate the full range and gives a corrective action. Nine added regression cases pass; the full integrated suite passes 141 tests in 15 files, plus TypeScript and production build checks. Physical pattern rules and the layout algorithm version are unchanged. The module ZIP includes the helper; UI and new regression cases are in the full Demo. See Member3-Q3-measurement-range-fix.md.

## Large-window performance update — 16 October 2026

The complete Demo reuses photo geometry for label-only edits, downloads compact JSON and serializes project panes sequentially with progress/error handling. The same 10000-dot handoff is 52.41% smaller (48.28 MB formatted versus 22.97 MB compact); no coordinates or outline points are removed. Schema v0.1 and the pattern algorithm are unchanged. Merge the Member 2 editor/export and Member 1 application/projectExport files together from the full Demo. The small module ZIP does not include that application patch. Verification: 158 tests in 18 files, TypeScript/build, an eight-pane Node stress probe and desktop browser downloads. Real-phone and several-real-photo stress checks remain pending. See PERFORMANCE_UPDATE.md.

## Smaller downloads — 16 October 2026

Application summary downloads now await source-resolution PNG previews rather than embedding huge SVG paths. The same eight-pane report is 4.24 MB instead of 59.25 MB. Advanced project data adds streamed JSON.gz, while retaining plain JSON; the eight-pane download is 66.50 MB instead of 197.63 MB and restores the same complete records except export timestamps. No physical coordinates, fields or outline points are removed from the technical data. Merge all five application files listed in SMALLER_DOWNLOADS.md from the full Demo; the module ZIP contains that note only. Summary download functions are now asynchronous and must be awaited. Verification: 158 tests in 19 files, TypeScript/build and actual eight-pane browser downloads, hash comparison and phone-width visual checks. Real-phone hardware remains pending.
