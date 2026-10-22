# BirdGlass — window treatments and building planning

## Open the app

Extract `BirdGlass-Member3-Demo.zip` fully, double-click `Start-Member3-Demo.cmd`, and open `http://127.0.0.1:5183/`. Keep its terminal open while using the app. Node.js is required; the included built demo needs no dependency installation. If the page is already running on that port, open it directly.

## Prepare a window

1. Upload a JPEG or PNG showing one flat glass pane. The illustrated example is available for practice.
2. Select the four glass corners clockwise, starting at the top-left. Exclude the frame.
3. Give the window an identifiable name and enter the actual measured glass width and height. Select the correct unit; the photo alone cannot provide physical scale.
4. Generate the preview, then switch between Original and With dots.

## Review the treatment

The **Treatment plan** shows the dot count and measured glass area. Its specification is 10 mm white circular dots with fixed 50 × 50 mm centre spacing, intended for exterior application across the pane.

**Layout checks passed** means that the calculated geometry passes the implemented checks. Material suitability, visibility and installation conditions still need site review.

Open **View spacing and edge checks** for the flat grid, the spacing explanation and the four measured clear boundary gaps. The 40 mm adjacent gap comes from 50 mm centre spacing minus 10 mm diameter. The maximum 25 mm boundary gap is an internal BirdGlass engineering rule, not an independently validated ecological threshold.

Technical coordinates and record identifiers are hidden under **Technical data**. Combined circular dot area is not used as full-pane film purchasing area.

## Build and compare a plan

1. Select **Add to building plan** for each treatment you want to include.
2. Enter a building/project name and record each window's location, such as floor, facade or room.
3. Compare glass dimensions, dot quantities and areas. Sort by order added, glass area or dot count. These sorts are quantity comparisons, not predictions of collision risk.
4. If dimensions change, generate the pattern again and explicitly **Update plan**. Changed or removed windows are flagged; stale quantities are excluded from totals and the building-summary download is disabled until resolved.

The prototype supports up to eight windows and 10,000 dots per pane. Photos, measurements and the building plan save in this browser on this device.

## Estimate materials

Choose full-pane patterned film or individual adhesive dots. Enter any additional material allowance and an optional supplier quote in RM per square metre or RM per dot. The app does not assume a market price. Changing material format clears the quote so it cannot be reused with a different billing unit.

For full-pane film, the estimate uses glass area plus the entered allowance. For individual dots, it uses the dot count plus allowance, rounded up to whole dots. Final supplier orders may require sheet/roll cutting, pack rounding and minimum charges. Artwork preparation and installation are excluded. Confirm exterior suitability and product instructions before buying.

## Download and share

- **Download treatment summary:** saves a readable HTML report for the active window.
- **Download building summary:** saves the selected current windows, total quantities and the entered material-estimate assumptions.
- Open the downloaded HTML in a browser. It includes the annotated photo previews, dimensions, specifications, layout checks and outstanding site review. Choose **Print / Save as PDF** for the browser's print dialog.
- **Download image** saves the active photo preview as a PNG.
- **Advanced project data** provides a JSON data copy for technical handover. It is separate from the readable report.

The downloadable example treatment summary uses illustrated windows and demonstration measurements, not field evidence. No collision-reduction prediction or field certification is provided.

## Development handover

The reusable dot algorithm and guideline version `2026-10-15.2` are unchanged. The full demo source adds `src/demo/planning.ts`, `BuildingPlan.tsx`, `planning.css` and `treatmentReport.ts`. The app connects them in `src/App.tsx`, with the simplified result UI in `src/demo/Member3Results.tsx`. Shared `WindowDraft` and layout types remain unchanged. `SavedProject` gains optional `buildingPlan` metadata; old saved projects without it still load.

Run `npm.cmd ci`, `npm.cmd test`, and `npm.cmd run build` for development. Rebuild after source changes; the launcher serves the included `dist/` directory.

Validation: **126 tests in 15 files**, TypeScript check and production build passed. Browser verification covered adding/comparing two windows, manually quoted material estimates, stale-plan blocking, updating a regenerated treatment and downloading a readable report. Smaller-screen layout and persistence were also checked.

## Placement reference and measurement scenarios

Select **Download placement sheet** for a dimensioned HTML reference with first-dot centre offsets and edge margins. Use its written measurements; its drawing is explicitly not to scale. Open **Check the effect of measurement variation** to explore a user-entered ± mm scenario. See PLACEMENT_UPGRADE.md for integration and performance details. The algorithm version is now member3-fixed-grid-1.1.0; dot size, spacing and guideline version remain unchanged.
