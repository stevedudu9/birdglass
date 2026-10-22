# Member 3 — implemented scope and remaining issues

Reviewed 16 October 2026 against the integrated source. Q1, Q2 and Q3 were reproduced and fixed on the same date in the integrated source and delivered Demo ZIP. The field-validation and performance limitations below remain open.

## What Member 3 implements

1. A centred, maximal rectangular grid of complete 10 mm white circular dots at fixed 50 × 50 mm centre spacing. Returns every dot centre in millimetres from the glass top-left origin, rows, columns, counts and versioned identifiers.
2. Independent geometry validation: complete grid, coordinate bounds including the 5 mm radius, fixed pitches, equal opposite margins, boundary gaps and matching record/revision/guideline identifiers. It remeasures coordinates rather than relying on a saved pass label.
3. Physical quantities: dot count, pane area, combined dot area and marked percentage. Supplier purchasing units, prices, installation costs and building prioritisation are separate application/planning responsibilities.
4. Treatment results and flat-grid visualisation, plus handover of physical coordinates to the photo projection module and quantities to the building plan.
5. A dimensioned printable HTML placement reference, showing the first-dot centre offsets, repeat spacing and clear edge margins. It provides a browser print/save-as-PDF action and is explicitly not a 1:1 sticking template.
6. Measurement-variation scenarios, row/column thresholds, pre-allocation capacity metadata, clearer capacity messages and coordinated support for 10,000 dots per pane. Validation lookup and photo projection support were adjusted with the shared interface preserved.

Current algorithm: `member3-fixed-grid-1.1.0`. Guideline: `2026-10-15.2`. The 25 mm clear-boundary ceiling remains BirdGlass engineering policy BG-EDGE-001, not an independently validated ecological threshold.

## Findings and resolution status

### Q1 / P2 — imported dot ordering changes the reported starting position — resolved

`src/demo/layoutSheet.ts` takes `dotsMm[0]` as the first/top-left dot. The placement instructions and technical data in `src/demo/Member3Results.tsx` use the same assumption. Neither the shared interface nor the validators require row-major array ordering.

Reproduction: generate the valid 1200 × 1500 mm, 720-dot layout, then reverse its dot array without changing any coordinates or identifiers. Both Member 2 and Member 3 geometry validators still pass. The exported sheet then reports 1175 mm from the left and 1475 mm from the top, rather than the correct 25 mm / 25 mm starting offsets. Repeating rows/columns from that starting point would be wrong.

Normal generation produces row-major dots, so this is an imported/reordered-layout path issue, not a failure of the normal grid calculation. Determine the top-left position from the minimum X and Y coordinates or the measured boundary gaps plus radius. Test reversed and shuffled arrays; the sheet and on-page placement instructions should stay unchanged. Do not fix this solely by silently rejecting otherwise valid external array ordering unless the team explicitly changes the contract.

Resolution: the page and exported placement sheet now derive the top-left centre from independently measured left/top clear gaps plus the dot radius. The flat drawing receives that same position. Imported ordering and all saved identifiers are preserved. Six new regression tests cover reversed and shuffled arrays, fractional sizes, single rows, single columns, a single dot, the on-page instructions and unchanged exported HTML. The new tests reproduced five failures before the fix and pass afterwards.

### Q2 / P2 — benchmark catches validation assertion failures without failing — resolved

`benchmarks/member3.bench.test.ts` wraps generation and its `expect` assertions in a broad catch, records an issue and breaks the loop. The test ends without asserting that supported benchmark cases completed successfully. A future generation or validation regression can therefore produce an apparently passing benchmark test. The follow-up Q2 check injected a geometry-validator rejection and reproduced a passing test before the fix.

Resolution: removed the broad catch. Each supported case must complete four runs with independently specified counts (4000, 4800 and 10000), matching coordinate/projected counts and both validators passing. The three measured runs exclude assertion overhead. Reports are written only after all cases pass. Five separate injected failures now correctly exit with code 1, including a generator failure on the second repetition. See Member3-Q2-benchmark-fix.md and Q2-failure-detection-results.json.

### Q3 / P3 — outside-range sensitivity wording — resolved

Before the fix, 10 × 10 mm with ±1 mm included an unsupported lower endpoint but set `countChanges` to true. Resolution: the helper now returns null for an unknown full-range comparison, and the UI says Cannot calculate the full range with instructions to reduce the variation or check dimensions. Nine added regression cases cover both limits, either axis, unsupported endpoints, zero variation and recovery. Browser checks confirmed stable, changing and unsupported ranges. See Member3-Q3-measurement-range-fix.md.

## Large-window performance — improvements implemented; real-device checks pending

A 5000 × 5000 mm pane has 10,000 dots. Its shared perspective handoff contains 480,000 outline vertices and serialized to **22,974,332 bytes** in the review probe using a placeholder image. A real photo would add more data. The measured count and byte size are recorded in `Member3-audit-findings.json`.

Follow-up improvements preserve the shared format: label-only edits reuse the projected preview, JSON downloads omit whitespace and project exports serialize each pane into Blob parts before allocating the next pane's projection. The measured formatted handoff is 48,275,278 bytes versus 22,974,352 bytes compact (52.41% smaller). All physical coordinates and 48 outline points per dot are preserved. Eight maximum-size panes completed a desktop Node stress probe; a desktop browser generated/exported one 10000-dot pane and a three-window project. See Member3-performance-update.md. The underlying geometry, accumulated download bytes, per-pane blocking work and real-phone/multiple-real-photo performance remain limitations. Do not raise the caps based on these desktop checks.

## Limits by design, not new defects

- One flat rectangular pane per record; no irregular outlines, curved glass or exclusion zones for holes/obstructions.
- Only the agreed 10 mm white / fixed 50 mm grid. Other products or layouts require a coordinated profile/algorithm change.
- Manual dimensions and units; the algorithm cannot establish the actual glass scale from a photo or determine how accurately it was measured.
- Measurement variation is a deterministic what-if range, not a probability estimate or field-installation tolerance.
- At most 10,000 dots per pane and eight windows in the current demo. The software dimension range is not evidence that such panes are practical building products.
- Printable HTML reference with browser-dependent PDF printing; no calibrated 1:1 placement template or supplier fabrication file.
- Geometry checks do not evaluate material durability, adhesion, installed contrast, exterior access or field collision outcomes. The guideline profile remains draft for final applicability/material/installation review.

## Recommended order

1. Completed: fix the imported starting-dot assumption and add permutation regression cases.
2. Completed: tighten benchmark failure handling and clarify unsupported sensitivity ranges.
3. Validate three to five real panes with Member 4: compare measured dimensions, generated count, first-centre offsets and clear margins against a physical mock-up or measured reference. Member 2 should separately verify the photo mapping.
4. Desktop improvements and stress checks completed; still test a real phone with several real-photo panes. Any deeper format change must preserve exact physical coordinates and be coordinated with Members 1 and 2.
5. Complete the latest shared-repository merge and source/material applicability review before the final demonstration. Additional pattern styles are lower priority than these checks.

## Test-status interpretation

After Q1, Q2, Q3 and the performance update, the full application run passed **158 tests in 19 files**, plus TypeScript and the production build. Six regression tests cover the imported dot-order defect, and nine added cases cover Q3 measurement ranges. This count covers the integrated application, not only Member 3. The historical audit probe and findings JSON record the before-fix reproduction; Q2 failure handling was verified with five separate fault-injection runs; these expected diagnostic failures are separate from the passing production suite.

For reproduction, copy `Member3-audit-probe.test.ts` back into the integrated project's `audit/` directory and run the targeted file with Vitest from the project root. It writes the findings JSON in the workspace outputs directory. It was moved out of the application after the review so it does not change the normal suite or shipped app.

## Smaller downloads follow-up

Readable application reports now use PNG previews (the eight-pane stress report shrank from 59.25 MB to 4.24 MB). The new streamed gzip option restores the unchanged v0.1 JSON; the eight-pane project download shrank from 197.63 MB to 66.50 MB, with all complete record hashes matching after excluding export timestamps. Plain JSON remains available and decompressed memory demand remains large. Real-phone and real-photo field checks are still pending. See Member3-smaller-downloads.md for implementation, integration and 158-test verification details.
