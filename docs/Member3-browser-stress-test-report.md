# BirdGlass browser stress test — 16 October 2026

All exercised checks passed. No application code changes were needed during this test.

Testing used a separate local origin on port 5184, leaving the user's port-5183 workspace unchanged. The eight stress panes used the app's illustrated example, each with synthetic 5000 × 5000 mm dimensions and 10000 dots. This is a desktop-browser test with an additional 390 × 844 viewport check, not a test on real phone hardware or field photographs.

| Check | Result |
|---|---|
| Regular automated suite | 148 tests passed in 18 files |
| Generate maximum supported pane | 10000 dots; 25 m²; layout checks passed |
| Phone-width pane layout | 390 px viewport; 375 px document width; no horizontal page overflow |
| Edit a corner at phone width | TL handle moved; count stayed 10000 |
| PNG download at phone width | Downloaded successfully after the corner edit |
| Maximum collection and plan | Eight 10000-dot panes; 80000 dots; 200 m² |
| Collection limit | Add window and Load example disabled at eight panes |
| Local persistence | Saved and reloaded all eight windows, their measurements, active pane, project name and current plan entries |
| Pane switching at phone width | Switched between panes 1 and 8 with the expected quantities |
| Full project download at phone width | 197627233 bytes; preparation progress and disabled export button observed |
| Downloaded JSON inspection | All eight records parsed, 80000 exact physical coordinates checked, all 3840000 outline vertices checked for finite coordinates, matching window/layout/revision/plan identifiers |
| Full readable report download | 59253716 bytes; eight pane sections and previews; totals 80000 dots and 200 m² |
| Open exported report | Opened in desktop browser and at 390 px width; eight sections present; no horizontal page overflow at phone width |

The JSON inspector reads one exported window record at a time. It checks 100 × 100 dots per pane, 10 mm diameter, 50 mm pitches, exact expected physical centres from (25,25) mm to (4975,4975) mm, unique dot IDs, all 48 outline points per projected dot, finite projected coordinates, matching versions and plan associations. Full details are in `Member3-full-browser-stress-results.json`. The inspector does not certify ecological effectiveness or installed accuracy.

Screenshots: `birdglass-phone-width-test.jpg` shows the 10000-dot treatment; `birdglass-eight-window-phone-report.jpg` shows the actual exported eight-window report at phone width.

## Remaining limitations

- The maximum project is approximately 197.6 MB with these illustrations, and the HTML report is approximately 59.3 MB. They still require substantial memory/storage despite compact JSON and sequential project generation.
- No real-phone CPU, RAM, touch interaction, download manager or browser suspension was tested. A narrow desktop viewport checks responsive layout, not those hardware behaviours.
- No real window photograph with independently measured dimensions was supplied for this test. Real-photo decoding and field-scale verification remain separate checks.
- The browser's Print / Save as PDF control was present; this test did not exercise a native print dialog or validate an exported PDF.
- No peak memory, sustained frame rate or input-latency guarantee is inferred from these successful functional checks. Keep the current engineering caps.

The temporary report tab and test server were closed after verification; the original app remains on port 5183. The isolated test data is separate from the original saved project.

Latest follow-up: these measurements describe the earlier export path. Readable downloads now use PNG previews and Advanced project data offers JSON.gz. The same stress report is now 4.24 MB and the compressed project is 66.50 MB. See Member3-smaller-downloads.md for the current implementation and verification.
