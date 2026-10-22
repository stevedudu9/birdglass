# Simplified public assessment — 17 October 2026

The normal assessment hides Advanced layout data, JSON import/export controls, technical IDs and revision numbers. The existing photo editor, algorithms, data contracts, validators and JSON helpers are retained.

## Public workflow
Upload a JPEG/PNG, mark TL → TR → BR → BL, enter actual glass dimensions, then generate. Review treatment & quantities links to the unique #pattern-results Treatment Summary. Download image remains beside the preview. The summary includes current dimensions, marker type/count, measured horizontal and vertical pitch, individual-dot or full-pane film quantities, and validation status.

Counts, area and spacing come from the existing validators and quantity engine. A single row/column has no pitch on that axis. Missing or invalid layouts do not display old quantities. An incomplete result is not presented as a pass. The current baseline profile remains draft pending team guideline review; passing geometry alone does not complete that review. Material quantities precede waste allowance, packaging and supplier cutting constraints.

## Debug integration tools
Normal: http://127.0.0.1:5188/#assess
Opt-in debugging: http://127.0.0.1:5188/?debug=1#assess

Reload without ?debug=1 to hide the tools again. This is a local UI switch, not authentication or a security boundary. Component consumers can pass debugMode=true explicitly. Debug mode restores algorithm request export, window JSON export/import and technical record details. Raw records keep their IDs/revisions. Readable report and placement-sheet identifiers are also hidden by default, with an optional debugMode export setting.

## Validation
- Production build and TypeScript check passed.
- Full suite: 202 tests across 25 files passed.
- Added coverage for unknown/incomplete/failed validation, forged pass/count metadata, stale revisions, true pass with a reviewed test profile, single-axis spacing, public/debug visibility, preserved report IDs in debug exports, and the full component journey.
- Live browser: uploaded window-example.png into a separate test pane; selected four corners; entered 120 × 150 cm; generated 720 dots with 50 mm pitch and 1.8 m² area; followed Review treatment & quantities; downloaded the PNG and readable HTML report. PNG header confirmed 1448 × 1216 pixels including its annotation footer. HTML showed incomplete validation and omitted technical record identifiers.
- Removed the temporary test pane through the normal recoverable remove control. Existing windows, screening observations and building-plan settings were preserved.

Launch the supplied prebuilt site with Start-BirdGlass-Web.cmd, then open http://127.0.0.1:5188/#assess. Development commands remain npm test and npm run build.
