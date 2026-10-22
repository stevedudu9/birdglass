# Automatic installation labour estimates — 17 October 2026

Implemented in the existing BirdGlass website. The current material catalogue, pattern engine, photo workflow, screening, JSON handoffs, multi-window selection and exports remain in place.

## Configuration
`src/config/installation.ts` centralizes methods, rates, the default method and source metadata.

- DIY: RM0 professional labour; own time/tools excluded.
- Standard professional: RM3.50/sq ft, the default planning assumption for compatible accessible sheet film.
- Conservative professional: RM5.00/sq ft for compatible sheet film.
- High-rise / difficult access: standard base film labour plus a separate access component. Access stays unpriced until explicitly entered.

Reference checked 2026-10-17:
https://hgsdisplaysdn.com/products/one-way-vision-sticker-eco-standard-5/
The supplier page publishes RM2.50–RM5.00/sq ft installation or quotation by site. RM3.50 is BirdGlass's planning assumption within that range, not a quoted supplier rate or an average. The product's separate RM55/order minimum is a product-order reference; it has not been adopted as a labour minimum.

## Calculations and boundaries
Installation labour uses measured glass area in square feet, not film allowance or purchased material minimums. Material + labour subtotal = calculated material cost + estimated labour. Monetary output rounds to two decimals; internal calculations retain precision.

For 1200 × 1500 mm (1.8 m², approximately 19.375 sq ft), standard printed film costs RM174.38. Standard labour is RM67.81, giving a material + labour subtotal of RM242.19. Conservative labour is RM96.88 and subtotal RM271.25. DIY professional labour is RM0 and subtotal RM174.38.

The material catalogue now specifies an installation basis. Standard and premium printed films use sheet-film assumptions. Die-cut frosted dots are treated as individually applied markers, so no sheet-film labour rate is silently used. Specialist markers, suspended cords and architectural glazing require separate labour quotations. Known material costs remain visible as a preliminary partial subtotal where labour is unknown.

Advanced Cost Settings includes optional minimum labour, mobilisation and difficult-access quotation fields. No default minimum/mobilisation is added. Minimum labour is a floor rather than an extra fee; mobilisation and entered access are added separately once per configured window. A shared mobilisation charge must be allocated once across windows, not repeated as a full project call-out on every window. An explicit zero quotation is preserved as zero, while a blank quote stays unknown where required.

Existing custom installation quotations are retained as custom labour quotes. Changing the method switches back to its planning rate without deleting the stored quote. A checkbox permits reusing the custom quote; DIY always keeps professional labour zero. Custom base labour does not silently cover difficult access.

The displayed material + labour subtotal excludes additional charges. Entered mobilisation, access, delivery and other costs are shown separately and included in a scoped planning total. Unquoted artwork, tax, equipment and site-specific charges are excluded. This is not a binding final installed quotation.

## Multi-window planning and export
Building totals and the homepage cost panel reflect current labour assumptions. Mixed DIY/professional methods remain per window. Unknown required labour or high-rise access keeps the scoped total incomplete; the optional budget suggestion excludes those windows rather than treating the missing component as free. An explicitly materials-only budget continues to ignore installation by design. Ecological recommendations never change with these costs. Previous project film/pack quotation calculations remain available separately.

Treatment and building HTML reports include method, reference/planning rate, calculated labour, material cost, subtotal, minimum labour, mobilisation/access status, exclusions, source/date and assumptions. Existing Print to PDF, image and placement-sheet exports remain. Material JSON records retain optional method, custom-quote setting and charge fields; the existing saved-record validator checks these new fields.

## Verification
- TypeScript check and production build passed.
- Full automated suite: 252 tests across 28 files passed.
- New installation suite covers DIY, standard/conservative methods, actual glass area rather than purchase allowance, high-rise access, explicit access RM0, custom quote behaviour, labour minimums/mobilisation, marker/specialist incompatibility, multiple windows, saved settings, invalid amounts, exports, method-selector interactions and unchanged pattern geometry.
- Live desktop browser checked all four method choices on a separate example pane, actual standard/DIY/conservative totals, high-rise missing access, explicit minimum/mobilisation, and the unsupported marker-labour state. The downloaded HTML report was read back and verified for RM174.38 material, RM67.81 labour, RM242.19 subtotal, selected difficult-access method, source link and access exclusion.
- Browser control became disabled in Work settings before final mobile screenshots and test-pane cleanup. Those final visual checks were not completed. No alternative browser-control method or direct modification of browser storage was used.
- The existing two saved panes remain. A third pane named **Temporary installation check** remains in the browser from the live test; it was not added to the building plan. It can be removed with the normal Remove this window control.

## Changed files
The list below is relative to the user project at:
`<project-folder>`.

- `src/config/installation.ts`
- `src/config/materialCatalog.ts`
- `src/demo/BuildingPlan.tsx`
- `src/features/materials/MaterialPlanner.tsx`
- `src/features/materials/estimate.ts`
- `src/features/materials/installation.ts`
- `src/features/materials/materials.css`
- `src/features/materials/report.ts`
- `src/features/materials/types.ts`
- `src/site/HomePage.tsx`
- `tests/installation.test.tsx`
- `tests/materials.test.tsx`

New handover: `INSTALLATION_ESTIMATOR_HANDOVER.md`. README updated. Production dist rebuilt. No dependencies added. Earlier removal of the generic pricing disclaimer/details from the webpage is retained; installation assumptions requested in this update are displayed alongside labour estimates.

## Design integration check
Newer material-selector, building-planner and screening styles were recovered from local editing history after an overlapping source sync. The recovered source rebuilt byte-for-byte to the newer existing production JavaScript and CSS (index-CPu1BSxf.js and index-CkE-m4YQ.css). The combined version passed all 252 tests and the production build. Browser checks above covered the earlier appearance; a final mobile visual check of the newer design remains outstanding.
