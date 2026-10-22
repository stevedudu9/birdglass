# Building Treatment Planner — 17 October 2026

The existing planning section is simplified for the hackathon website. No new page, dependencies, or replacement application were added.

## Public workflow

Add a generated window treatment to the building plan, compare the saved windows, select the panes to treat, and download the selected plan. Six summary cards show windows assessed, selected count, selected area, material cost, supported installation labour, and indicative material + labour subtotal. Extra charges and unpriced components remain separate. Unknown prices are labelled as quotation required; partial totals are identified as known costs only.

The comparison includes each window's name/location, dimensions, dot quantity, glass area, preliminary ecological screening result, selected material, material cost and labour. Sorting supports screening priority, estimated cost and window area, plus original order. Incomplete estimated costs appear after fully priced treatments. Sorting and cost changes never alter screening results. Choose treatment opens that window's material selector; Edit window opens its photo/measurement workspace.

The existing white cards, green/blue accents and typography are retained. Below 900 px the comparison table becomes labelled window cards; summary cards use two columns and then one column below 420 px. Keyboard focus remains visible and deselected rows retain readable contrast.

## Preserved functionality

Budget optimization and previous project quotation panels are removed from the planner interface, including debug mode. The underlying calculation functions and saved models remain available for integration. Their algorithms, saved fields, JSON models and tests remain intact. Public totals use the current per-window catalogue and installation settings; hidden saved budgets or legacy quotation errors cannot block downloads. Saved data is not erased or automatically rewritten to discard those fields. The homepage cost summary uses the same public pricing basis.

Material catalogue, pricing engine, installation methods/minimum labour/mobilisation/access, pattern generation, physical validation, screening and report downloads are preserved. Normal exports omit budget comparisons, while explicit debug reports can still include retained quotation/budget information.

## Reports

Building reports include selected windows only: screening and overrides, treatment choices, dot quantities, glass measurements, material/labour/subtotal, source assumptions and exclusions. Deselected windows are filtered before validation and photo rendering so an obsolete deselected pane cannot block the selected export. Individual-window treatment reports still work independently of building-plan selection. No selected windows disables the public download button and gives the requested selection prompt.

## Verification

All 261 automated tests across 28 files passed. TypeScript check and production build passed. Automated coverage includes adding windows and saving the plan, select/deselect totals, empty-state navigation, treatment changes, sorting and missing prices, unchanged ecological priority, saved invalid budget/legacy settings, retained optimization algorithms, stale layouts, selected-only report data and PNG previews, and installation compatibility/access exclusions.

Browser control is disabled in Work settings, so the final desktop/mobile visual inspection and a fresh live download click were not completed for this update. Responsive behaviour was implemented in scoped CSS and functional interactions/download generation were tested automatically. The previous test pane named Temporary installation check may remain in the user's browser; this update does not modify browser storage directly.

Follow-up: both budget and previous-project-quotation panels are removed entirely from the rendered planner. 58 relevant tests and the production build passed; saved settings and backend calculation functions are preserved.
