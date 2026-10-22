# BirdGlass boundary-spacing decision

Researched 15 October 2026. Decision: adopt **BG-EDGE-001**, a maximum **25 mm clear distance** from each exposed glass edge to the nearest circular dot edge. This is a BirdGlass engineering policy derived from the agreed grid, not an externally prescribed or experimentally validated ecological threshold.

The dot diameter remains 10 mm; horizontal and vertical centre spacing remain fixed at 50 mm. The shared guideline version changes from `2026-10-15.1` to `2026-10-15.2`. The source/material applicability status remains draft; setting an internal boundary rule does not imply field validation.

## What the public guidance actually says

| Source and location | Short exact passage | What it establishes |
|---|---|---|
| Environment and Climate Change Canada, “How can I prevent collisions?” | “the pattern must be applied across the entire glass surface” | Whole-pane coverage; this is not a separately defined glass-edge-to-dot-edge limit. |
| FLAP, “Marker Coverage” | “Visual marker patterns must cover the entire surface of the window.” | The pattern should extend throughout the pane. Its spacing clauses concern markers and do not separately define a numeric perimeter-clearance test. |
| FLAP, Feather Friendly tutorial, Step 2 | “place the marker-tape 2 inches from the top of the window” | An explicit product installation starting offset. It refers to tape positioning, not a universal maximum clear distance from glass to circular dot edge. |
| CollidEscape, commercial dot product description | “starting 2″ from edge of window pane” | Another product-specific placement instruction. It does not establish a universal 25 mm or 50 mm edge-to-dot-edge rule. |

Sources:

- [Canadian government FAQ](https://www.canada.ca/en/environment-climate-change/services/avoiding-harm-migratory-birds/faq-bird-collisions-glass-windows.html)
- [FLAP marker guidance](https://www.flap.org/stop-birds-from-hitting-windows/)
- [FLAP installation tutorial](https://www.flap.org/our-blog/how-to-install-feather-friendly-tape-to-prevent-bird-window-collisions)
- [CollidEscape product instructions](https://shop.collidescape.org/product/pro-white/)

[Toronto Green Standard V4 EC 5.1 and its specifications](https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/toronto-green-standard/toronto-green-standard-version-4/mid-to-high-rise-residential-non-residential-version-4/ecology-biodiversity/) address surface, size, contrast and 50 × 50 mm marker spacing. I did not find a separate glass-edge-to-dot-edge maximum in that public section.

The [CSA A460:19 (R2024) product page](https://www.csagroup.org/store/product/CSA%20A460:19/) confirms that the standard exists, but its full technical clauses were not accessible in this research session. Therefore, the conclusion is limited to the accessible guidance reviewed. It would be incorrect to state that no standard anywhere contains a boundary requirement, or to attribute our 25 mm limit to CSA.

## Comparison with other work

| Work | Documented approach | Decision for BirdGlass |
|---|---|---|
| FLAP’s Feather Friendly tutorial | Begins tape placement 2 inches below the top, then repeats rows at 2-inch intervals. | Useful evidence that a starting offset is a product installation choice. Do not treat it as a universal clear-edge maximum. |
| CollidEscape commercial dots | Product description starts placement 2 inches from the pane edge. | Follow the selected product’s actual instructions for installation; do not infer that every dot layout has the same margin rule. |
| WingGap | Its project description reports a 45 mm-or-less centre-pitch target and a separate 50.8 mm clear-spacing/boundary threshold. | A relevant software precedent, but the project’s chosen threshold does not establish an independent ecological standard. |
| Enbilex planner | Uses equal-sized cells, places dots at cell centres and adjusts actual pitch to pane dimensions; identifies the placement convention as authored. | A useful example of explicitly labelling a layout convention. Do not copy its pitch adjustment because our team agreed to fixed 50 mm pitch. |

References: [WingGap](https://devpost.com/software/winggap), [Enbilex placement method](https://enbilex.com/en/window-strike-prevention-spacing-calculator/).

## Edge-specific research and its limits

Zyśk-Gorczyńska, Bojarska and Żmihorski (2021), *Nonrandom Bird-Glass Collision Pattern: Fewer Strikes Near Glass Edge*, studied 85 glass bus shelters. The authors’ institute reports that only 3% of collisions occurred within 10 cm of a glass edge, even though that band represented over 30% of the glass area on average.

That is observational evidence about where impacts occurred. It is not an experiment establishing the performance of 25 mm, 50 mm or 100 mm untreated borders for BirdGlass’s chosen dot pattern. We will not use it to declare a 100 mm border safe or override whole-pane guidance. This is our interpretation of the study’s scope.

Sources: [authors’ institute, publication notice dated 3 September 2021](https://www.iop.krakow.pl/aktualnosci_1_31,2021.html), [paper DOI](https://doi.org/10.3161/00016454AO2021.56.1.012). The institute’s summary was accessible; the full paper was not obtained.

## Why our engineering ceiling is 25 mm

Consider one pane dimension `L`, dot diameter `d = 10` and fixed pitch `p = 50`, all in millimetres.

```text
n = floor((L - d) / p) + 1
occupied length, including both outside radii = d + (n - 1) × p
unused length = L - occupied length
clear margin on each side = unused length / 2
```

The grid fits as many complete dots as possible at the fixed pitch. Consequently, unused length is at least zero and less than 50 mm. Centring splits that remainder equally:

```text
0 ≤ each clear margin < 25 mm
```

The validator uses an inclusive 25 mm ceiling, with only a tiny numerical comparison tolerance. This tolerance handles floating-point arithmetic, not physical installation error. A valid generated grid should actually remain strictly below the ceiling mathematically.

This choice preserves every existing generated layout and dot count. It is an explicit check on the implemented geometry, rather than a claim that biology establishes a 25 mm boundary threshold.

Choosing a 20 mm ceiling would reject some full-dot, fixed-spacing panes: for a 1259.9 mm side, 25 dots occupy 1210 mm, leaving 24.95 mm clear on each side. A 26th dot would need 1260 mm and would not fit. Conversely, a looser 50 mm limit would not describe the tighter bound already guaranteed by our chosen centring method. These are geometric comparisons, not evidence that one clearance prevents more collisions than another.

## Exact definition for implementation

Measure from the exposed glass boundary, excluding the frame, to the nearest circular dot edge, perpendicular to that pane edge. In physical TL-origin coordinates with radius `r = 5 mm`:

```text
left   = minimum dot-centre X - r
right  = widthMm  - maximum dot-centre X - r
top    = minimum dot-centre Y - r
bottom = heightMm - maximum dot-centre Y - r
```

Require complete dots inside the glass and each margin no greater than 25 mm. Retain all existing regular-grid, fixed-pitch, centring, identifier and version checks. The 25 mm measurement is not centre-to-edge distance; a centre may be almost 30 mm from the edge when its dot radius is included.

## Updated shared baseline

```text
guidelineId:             birdglass-white-10-50
guidelineVersion:        2026-10-15.2
dotDiameterMm:          10
targetCenterPitchXmm:   50
targetCenterPitchYmm:   50
maxClearGapXmm:         40
maxClearGapYmm:         40
maxBoundaryClearGapMm:  25
boundaryDefinition:     glass-edge-to-dot-edge
boundary policy ID:     BG-EDGE-001
boundary policy basis:  BirdGlass engineering convention
```

For 1200 × 1500 mm, the output stays at 720 dots and 20 mm clear margins. The measured margins satisfy BG-EDGE-001.

Changing the guideline version invalidates old layouts. Regenerate them; do not rewrite an old layout’s identifiers to make it look current. Member 2’s public types do not need modification because the boundary field already exists.

## Wording to carry into the app and report

> BirdGlass applies a 25 mm maximum clear edge gap as an internal planning rule derived from its centred 50 mm grid. Published sources support full-pane exterior coverage, but this perimeter value is not an independently validated ecological threshold. Material suitability and installed performance require separate review.

The missing numeric boundary decision is now resolved for software planning. Final material, visibility, installation and source-applicability checks remain distinct; do not convert the overall draft profile into certification or claim an expected collision-reduction percentage.
