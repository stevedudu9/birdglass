# Advanced Cost Settings verification — 18 October 2026

All nine per-window settings were checked through calculation, form interaction, selected-window planning, readable report export and application autosave/reload. The screenshot's custom RM20/sq ft rate replaces the material rate, while preserving the original reference. It does not change dot positions or ecological screening.

## Rules

- Material quantity = measured pane area in the catalogue unit × (1 + allowance / 100), subject to any configured supplier minimum area. Material cost = max(quantity × effective unit price, entered/configured minimum material charge).
- Film labour uses actual glass area, not the purchased allowance. A custom labour quote replaces the area-rate labour; it is not added to it. The optional labour minimum is a floor, not an additional fee. DIY professional labour remains zero.
- Mobilisation, applicable difficult-access quote, delivery and other charges are additional per-window amounts, added once to the material + labour subtotal. Shared project charges must be allocated once, rather than repeated on every pane.
- Blank rate uses the catalogue reference; blank optional minimum/allowance has no invented default. Blank required specialist labour or difficult access stays unpriced. Explicit zero is accepted. Allowance must be between 0 and 100; active negative, nonnumeric, infinite and scientific-notation strings are rejected.
- Individual-marker/specialist installations do not receive the generic film labour rate. Quote-only materials do not acquire an area price from an unrelated override.

## Corrections

Previously a malformed stored access value could block a standard installation estimate even when the access field was disabled. Inactive saved values are now retained, but not parsed or applied to a different method. They are validated again when explicitly reactivated. The same rule covers unused custom labour quotes, DIY labour minima and incompatible area-pricing fields.

Fields now show accessible inline errors. DIY labour quote/minimum controls and its quote toggle are disabled with an explanation. A saved quote that is turned off stays editable and can be explicitly re-enabled. Applicable access/area controls follow the chosen method/material. Reset returns to catalogue/default installation settings, without altering the pattern.

Entered extras and the planning total including those extras now appear together in the right-side cost summary. The main material + labour subtotal retains its original scope; extras are not silently included twice. Missing required charges remain visibly incomplete.

## Verification

Focused cost/material/installation suite: 99 tests passed. TypeScript and production build passed. A combined example tests all nine settings: 10% allowance, custom RM20 rate, RM500 material floor, RM80 labour quotation raised to a RM100 labour floor, RM20 mobilisation + RM30 access + RM40 delivery + RM50 other charges. Result: RM600 material + labour subtotal; RM740 including entered charges. Two selected windows sum correctly; deselection excludes the other pane's charges.

Automated UI tests verify all nine inputs, errors and recovery, DIY/standard/difficult-access transitions, quotation toggles, reset, different-window state, Home/Assess navigation and reloading the autosaved record. These are JSdom/application-state tests, not live browser or manual IndexedDB tests. Local browser access is disabled in Work settings, so no browser screenshot or visual acceptance is claimed.

Full regression verification: all 345 tests across 33 files passed. Production build and TypeScript passed.
