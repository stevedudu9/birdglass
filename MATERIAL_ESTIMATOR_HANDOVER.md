# Automatic material selection and indicative cost estimator
Implemented in the existing BirdGlass Design C website on 17 October 2026.

## Outcome
The standard flow is photo → four corners → measured dimensions → generated pattern → select material → review treatment → download. No unit price or installation charge is required to complete this flow. The normal catalogue offers three visual treatment concepts. Users can also inspect three unpriced specialist systems.

## Catalogue and verified price basis
Configuration: `src/config/materialCatalog.ts`.

| Material concept | Reference | Unit | Qualification |
| --- | ---: | --- | --- |
| Standard Printed-Dot Film | RM9.00 | sq ft | Banner3 normal clear-film white printing reference |
| Premium Ultra-Clear Printed-Dot Film | RM12.00 | sq ft | Banner3 ultra-clear white printing reference |
| Die-Cut Frosted Pattern Sticker | RM7.00 | sq ft | e-banner plain frosted die-cut reference; not white-print pricing |

Checked 2026-10-17. These are individual published references, not market averages and not independently qualified bird-collision products.
- Banner3: https://www.banner3.com/ampang-frosted-glass-sticker . Search-indexed supplier content verified normal and ultra-clear white printing rates. Installation and artwork preparation are excluded; minimum charges may apply, but no numeric minimum was published in the inspected text.
- e-banner: https://my.e-banner.com/frosted-sticker/ . Verified the live supplier table in the browser: plain die-cut/kiss-cut RM7 per sq ft; white-print UV-W die-cut/kiss-cut RM10 per sq ft. The interface explicitly distinguishes these specifications. The RM7 concept requires contrast/fabrication confirmation to match the white-dot preview.
- Supplier statements about outdoor durability are not treated as independent product qualification. Exterior suitability and bird-collision performance flags remain false.

The catalogue supports published reference, comparable average, research assumption and quotation-required labels. Only published references and quotation-required options are used now. Unsupported prices remain null. No average has been invented.

## Calculation and quantities
`src/features/materials/estimate.ts` reuses canonical dimensions through `readDimensions`.
- area m² = width mm × height mm / 1,000,000.
- area sq ft = area m² × 10.7639104167.
- A supported area rate uses its actual unit. Chargeable quantity includes only an explicit allowance and any configured supplier minimum area.
- A material minimum charge is a floor: max(area × rate, minimum charge), not an extra fee.
- Full internal precision is retained; money is displayed at two decimals. A 1200 × 1500 mm pane costs RM174.38, RM232.50 or RM135.63 at the three references, before installation and stated exclusions.
- No wastage percentage is silently added; default allowance is 0%.
- Unknown installation stays null. Explicit RM0 installation is accepted as an entered no-charge quote. Delivery/other charges are included only when entered and are otherwise excluded, not represented as known free services.
- Pack, linear and quote-only systems do not inherit the film formula. Their costs remain unavailable pending product-specific data.

## Interface and preserved data
`MaterialPlanner.tsx` provides responsive cards, a selected state, illustrations built in CSS, actual cost breakdown, source/date, compatibility warnings, exclusions and collapsed Advanced Cost Settings. It reuses Design C typography and colours.
Each `WindowDraft` optionally stores `material: { materialId, overrides }`. Changing dimensions recalculates its area estimate immediately while the existing geometry engine invalidates the old pattern as before. Changing material does not alter physical dots or ecological screening. Selecting a different material starts its catalogue settings; existing project-level legacy quotes remain separately stored.
Treatment Summary shows the selected material and material-only estimate. Review and download links are preserved. The new #choose-treatment anchor is registered as an assessment route.

Manual per-window overrides support unit price, installation quote, minimum material charge, allowance, delivery and other costs. They are labelled user-entered quotation/assumption; the original reference remains visible. Reset returns to catalogue settings. Delivery/other entered costs here apply to this window, so shared charges must be allocated without duplication.
Previous project film/pack prices, shared-pack rounding, installation-per-window and one-time project fee functionality remain inside the collapsed previous-project-quotation section. They affect totals only after an explicit opt-in. Existing saved prices and budget values are retained; no legacy rate is reinterpreted as a catalogue price.

## Multiple windows and optional budget
Every window can use its own material. Building and homepage totals reuse the same estimator. Missing prices and stale layouts produce explicitly partial known material subtotals; unknown installation prevents a complete installed total.
Optimize Within Budget is off by default. When enabled, users can compare a budget against materials plus quoted installation, or explicitly materials only. The suggestion is a documented priority-first greedy selection, not global mathematical optimization. Unknown required costs and stale layouts are excluded rather than costed at zero. It never changes ecological recommendations or observations. Legacy shared pack/project quotes keep manual selection; per-window greedy suggestions require catalogue mode.

## Reports and JSON
Readable treatment and building reports include actual dimensions, marker specifications and validation status, selected material, quantity/rate/cost, source link/date, custom assumptions, exclusions and the preliminary-estimate statement. A report does not certify products or collision prevention. The existing HTML / Print-to-PDF and placement-sheet / image downloads remain. Normal reports still hide internal UUIDs and revisions.
JSON and gzip project export functions remain. JSON handoffs include the optional per-window material selection and overrides. Geometry requests and dot data are unchanged. Saved projects remain backwards-compatible through optional fields, with validation of new selection and budget fields.

## Verification
- Production build and TypeScript check passed.
- Full suite: 226 tests in 26 files passed (24 material-specific tests plus the preserved suites).
- Automated coverage: unit conversion; all three rates; per-m² support; precision; material/dimension changes; explicit allowance/minimum floor; custom quotes; missing and explicit-zero installation; quote-only/unsupported models; invalid prices; mixed and partial totals; stale layouts; optional budgets; unknown-cost exclusion; priority ordering without changing screening; real-value report output; JSON selection persistence; default collapsed controls; material-route navigation; full upload-to-image-download component journey.
- Live browser journey used the supplied window photo in a temporary pane: upload, TL/TR/BR/BL, 120 × 150 cm, generate 720 dots, choose each priced material, review and download. Actual PNG (1448 × 1216 including footer) and HTML report were read back and checked for source, rate, cost, exclusions, incomplete validation and hidden record IDs.
- Desktop 1280 px and mobile 390 px inspected. Mobile catalogue uses one column; document content width 375 px including the browser scrollbar allocation, with no horizontal page overflow. Temporary viewport override was reset.
- Live partial building totals and unknown-cost budget state were verified. Temporary plan entry/window were removed through UI. Existing two windows, their dimensions, screening observations and legacy quote data were retained.

## Limitations and future price updates
The three prices are references for custom treatment concepts. Supplier production of the selected dot specification, exterior glass compatibility, contrast, product performance, artwork and minimum orders still require confirmation. No independently qualified product, installed-project quotation or collision-reduction guarantee is implied. Supplier minimum numbers and specialist Malaysian prices are unverified and left unconfigured. Tax, roll cutting, minimum fabrication sizes and unentered charges are not automatically priced. Geometry research review remains incomplete under the existing draft baseline.
Update `MATERIAL_CATALOG` in `src/config/materialCatalog.ts`: verify the same specification/unit on the supplier page, then edit `unitPrice`, `pricingModel`, `sourceUrl`, `sourceCheckedDate`, limitations and numeric minimums only when supported. Do not mix the RM7 plain frosted specification with the RM10 white-print upgrade. Run `npm test` and `npm run build`, then use the rebuilt dist. Price changes recalculate current catalogue estimates; historic price snapshots are not stored. Never set suitability/performance flags true without suitable evidence.

## Exact source/test files changed
Paths below are relative to the existing project root:
`<project-folder>`.

- `src/App.tsx`
- `src/config/materialCatalog.ts`
- `src/demo/BuildingPlan.tsx`
- `src/demo/Member3Results.tsx`
- `src/demo/planning.ts`
- `src/demo/storage.ts`
- `src/demo/treatmentReport.ts`
- `src/features/materials/MaterialPlanner.tsx`
- `src/features/materials/estimate.ts`
- `src/features/materials/materials.css`
- `src/features/materials/report.ts`
- `src/features/materials/types.ts`
- `src/features/member2/export.ts`
- `src/features/member2/types.ts`
- `src/site/HomePage.tsx`
- `src/site/SiteHeader.tsx`
- `tests/compact-report.test.ts`
- `tests/materials.test.tsx`
- `tests/planning-ui.test.tsx`
- `tests/planning.test.ts`
- `tests/site.test.tsx`
- `tests/treatment-summary.test.tsx`

Documentation added/updated: `MATERIAL_ESTIMATOR_HANDOVER.md`, `README.md`. Production output: `dist/index.html` and the matching generated JS/CSS assets. No dependencies, image/perspective modules, pattern algorithm or screening rules were replaced.
