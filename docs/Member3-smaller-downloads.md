# Smaller BirdGlass downloads — 16 October 2026

The normal readable report now embeds PNG previews instead of hundreds of thousands of SVG outline vertices per pane. Advanced project data now offers a streamed gzip download alongside the existing JSON download. Dot generation, physical coordinates, guideline identifiers and the shared v0.1 JSON structure are unchanged.

## Results on the same eight-pane illustrated project

Each stress pane is 5000 × 5000 mm with 10000 dots: eight panes, 80000 dots and 200 m² in total.

| Download | Previous | New | Reduction |
|---|---:|---:|---:|
| Readable HTML report | 59,253,716 bytes | 4,241,492 bytes | 92.84% |
| Technical project | 197,627,233-byte JSON | 66,495,795-byte JSON.gz | 66.35% |

The original two-window example still has 1320 dots and 3.3 m². Its new report is 627372 bytes.

Compression depends on photo content and geometry. The separate simple rectangular 10000-dot fixture compresses from about 23 MB to about 2 MB; that is not the reduction observed for every building. The eight-pane results above are actual downloads from the browser using the same saved test project as the previous stress run.

## Readable report

- Standard Download treatment summary and Download building summary actions now render each validated preview to PNG at the normalized source image resolution. Written dimensions, dot counts, quantities, costs, margins and identifiers remain HTML text/tables.
- The PNG is produced by the same projection and canvas code as the image export, including all 48 outline samples per dot before rasterization. It includes the existing preview notice footer. PNG encoding preserves the rendered pixels; a raster preview is resolution-limited and is not a vector fabrication template.
- The report no longer contains millions of SVG path coordinates. It remains self-contained and readable offline, with the existing Print / Save as PDF action.
- Preview creation is sequential, reports progress and disables duplicate summary downloads. A failed preview rejects the export instead of downloading a partial report or reporting success prematurely. Layouts are revalidated at export time.
- Report number formatting now actually retains its intended four decimal places, rather than allowing locale formatting to round them again to three.

The existing synchronous `buildTreatmentReport` helper retains its SVG path for compatibility. Application downloads use the new asynchronous `createTreatmentReport`/`downloadTreatmentReport` path. Callers must await `downloadTreatmentReport` and handle rejection. The integrated App does so.

## Technical project

Under Advanced project data, choose **Download compressed project (.json.gz)**. Extract the gzip file to obtain the full JSON. **Download project data** still provides uncompressed JSON for existing consumers.

The compressed builder feeds the same header and window records into native gzip with stream backpressure. It does not first construct the complete uncompressed project Blob. One pane's geometry and serialized record are still created at a time, and the compressed output is accumulated for the download. The current pane preview also remains in memory; this is not a zero-copy or peak-memory guarantee.

No points are removed, no numbers rounded and no image assets omitted. Browsers without native CompressionStream keep the ordinary JSON option; the compressed button is shown only when that capability exists. Extracted JSON retains schema version 0.1 and all existing handoff fields.

## Verification

- **158 tests passed in 19 files**, plus TypeScript checking and the production build.
- Added coverage includes gzip magic bytes, byte-identical JSON after extraction under a fixed clock, all eight windows, numerical precision, collection snapshots, stream failure propagation and the unavailable-compression fallback.
- Report tests cover PNG markup, quantities, purchasing, escaping, stale-layout rejection, missing/unsafe previews, non-PNG results and partial-download prevention. UI tests verify awaiting completion, busy/error recovery and the gzip download filename/instructions.
- The actual eight-pane gzip was extracted and inspected. Every physical coordinate and all 3840000 projected outline vertices passed the existing inspector. Hashes of all eight complete window records and project metadata match the earlier uncompressed export after excluding export timestamps. No data beyond timestamps differs.
- The actual report has eight PNG previews and eight pane sections, with 80000 dots and 200 m². All eight PNGs decode at 1280 × 1015 pixels, including the existing footer. The report was visually inspected and fits a 390 px viewport without horizontal page overflow.
- The original two-window plan was also re-exported successfully and remains unchanged. Stress testing used a separate local origin.

See `Member3-smaller-download-results.json`, `Member3-gzip-project-hashes.json` and the screenshots. The diagnostic inspector is supplied under `docs/performance-diagnostics/inspect-browser-stress-export.cjs` in the full Demo; it accepts a raw JSON or gzip input and checks this specific eight-pane stress fixture.

## Integration and remaining work

Use the full Demo for this application update. Merge `src/App.tsx`, `src/demo/projectExport.ts`, `src/demo/treatmentReport.ts`, `src/demo/BuildingPlan.tsx` and `src/demo/Member3Results.tsx` together with the tests and benchmark update. The small Member 3 module ZIP contains the handover note, not the complete application patch. Shared team types and the pattern algorithm version remain unchanged.

The compressed project still expands to approximately 198 MB for this stress fixture. Large-pane generation/serialization still has synchronous work. Real-phone hardware, real photographs, field measurements, material suitability and installation applicability remain unverified. Native PDF printing was not exercised in this run. The 10000-dot/eight-window caps remain in place.
