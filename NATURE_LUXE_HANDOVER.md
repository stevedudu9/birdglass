# BirdGlass Nature-Luxe assessment redesign — 17 October 2026

## Visual scope

The assessment workspace now has a compact architectural hero with the requested headline, navy Georgia headings, Manrope supporting text, and a continuous sky/mint canvas through photo preparation, treatment selection, pattern summary, ecological assessment, building planner and footer. The homepage is unchanged. Existing original building/bird artwork is reused; no stock photography or new dependencies were added.

The treatment estimator has a two-column desktop layout. Project details, selected material, physical quantity and calculation formulas sit on the left; the cost summary sits on the right. The subtotal appears once in this panel, with material and labour line items below it. Additional charge details are collapsed below the action. Pricing assumptions and supplier/labour source links were removed from this webpage at the user request; the underlying data and exported-report references are retained. One notice communicates exclusions and required unpriced components. Individually applied markers/specialist systems keep their existing quotation requirements. Selected-material artwork is a CSS illustration labelled Material concept; specialist systems do not display a film sheet.

## Functionality retained

No changes to the pricing catalogue, pricing/installation engines, pattern generator, physical validator, photo geometry, report generation or planning data model. Their source bytes were compared with the pre-design snapshot. Material selection, unit rates, allowances, minimum charges, mobilisation/access settings, JSON integration and multi-window planning remain intact. The plan action calls the existing add handler, and is disabled until a selected material and a current valid window layout exist. Pending guideline review is not represented as certification or a completed review.

Calculation formulas use the actual chargeable quantity/unit and raw calculated price; minimums are explained separately while final costs use the existing engine. A material allowance therefore does not change the installation area. Costs remain planning assumptions, not supplier quotations. Unsupported generic verified/eco-aligned/finish-performance badges were removed.

## Responsive implementation

Desktop uses a left details column and right cost panel. The panel sticks below the header on sufficiently tall desktop viewports, and stops sticking on short screens. At 900 px and below, it returns to normal flow. Tablet layouts reduce nested columns; phone layouts stack material choices, calculations and advanced settings. The page has visible keyboard focus, reduced-motion support, flexible values and 16 px form text on phones where applicable.

## Verification and limits

- TypeScript check and production build passed.
- All 268 tests across 29 files passed.
- Regression tests cover source disclosure, real totals, method changes, optional minimums/mobilisation, stale-layout gating, the add-to-plan callback, specialist labour/imagery, invalid charges and unchanged layout data. Existing upload/corner, material, installation, multi-window, priority and export tests also pass.
- Calculated palette contrast: navy headings 14.24:1, supporting text 6.00:1, links 6.04:1, white button text against the lightest green stop 4.58:1. These checks cover palette choices, not a full rendered-page accessibility audit.
- Browser tooling reports Local browser use is disabled in Work settings, including after the user reported enabling it. Consequently actual desktop/tablet/mobile rendering, typography/spacing screenshots and screenshot comparison were not completed. No alternate automation method was used to bypass that setting. Responsive CSS and functional tests are implemented, but visual acceptance at specific widths remains outstanding.

Main files: src/nature-workspace.css, src/site/NatureWorkspaceHero.tsx, src/App.tsx, src/features/materials/MaterialPlanner.tsx, src/features/materials/materials.css, tests/nature-luxe.test.tsx.
