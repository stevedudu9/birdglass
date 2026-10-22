# Window priority screening — BG-SCREEN v1.0.0

Implemented 16 October 2026. Open `http://127.0.0.1:5188/#priority-assessment`, or use **Screen & plan** in the assessment workflow. Every plan row has **Review screening** for its window. The homepage dashboard and downloadable treatment summary use the same assessment engine.

This is a transparent preliminary hazard screen, not a validated ecological scoring model, legal assessment, collision probability or estimate of bird deaths prevented. It does not analyse the image automatically or change your treatment budget/selection.

## Inputs and area

The form collects the requested ten factors: collision observations, reflection, transparency/fly-through, vegetation, automatic area, canopy-relative height, architecture, bird attractants, nighttime lighting and existing treatment. Nine categorical answers default to **Unknown**; missing historic records remain unknown. Existing treatment also has Unknown so a missing answer cannot imply no treatment or verified safety.

Area uses measured width × height with mm/cm/m conversion. If no treatment is present, the whole pane is untreated. For unverified/unknown treatment, the exact untreated area is **not verified**, with the whole pane displayed as the potential area. Only a recorded suitable treatment verified across the **entire pane** gives a reported untreated area of zero. A whole-pane verification reference is required; the software does not independently verify the product or installation. A proposed preview is never counted as an installed treatment.

“Very close”, reflection strength and lighting categories are user observations. No distance, reflectance or lux threshold is silently invented. Record the inspection context in site notes. Other architecture requires further review; it is not silently mapped to Standard. None reported is not evidence that collisions never occurred. Glass above canopy and small glass panes are not automatically exempt.

## Decision order

1. Reported documented past collisions → **High**, even with missing inputs or a verified-treatment claim. Ask for date/evidence details; a collision/treatment conflict requires reconciliation of dates, coverage, condition and installation.
2. A verified-treatment claim without its whole-pane verification record → **Needs Review**, unless the collision rule already applies.
3. For glass without recorded verified treatment, any of these project-policy combinations → **High**: strong reflections + very close vegetation; apparent fly-through + glass corner/parallel glazing/railing; strong reflections + bird attractants + within canopy height.
4. Known individual indicators → **Medium**: some/strong reflections, apparent fly-through, nearby vegetation, glass corner/parallel glazing/railing, bird attractants, moderate/high nighttime lighting. The canopy + nearby vegetation combination is also explicitly recorded as a rationale.
5. If no escalation rule applies but information is missing/unverified → **Needs Review**. Otherwise → **Lower**, meaning relative attention among completed observations, never proof of safety.

Unknowns remain listed with High or Medium. A recorded verified whole-pane treatment suppresses the glass-design triggers but not a reported collision or lighting concern. Some conflicting inputs therefore remain High or Needs Review instead of becoming Lower.

No pane-area threshold is enabled by default. The area is reported as context, with no small-pane exemption. A future reviewed configuration may set an explicit project-policy threshold. This version does not invent a research-derived cutoff.

Rules, conditions, source IDs, tier labels, version and optional area threshold are in `src/features/screening/config.ts`. `screenWindow` is a pure function with injectable configuration in `assessment.ts`. Changing only the configuration is enough to revise combinations without replacing the UI. Every result records the configuration ID/version and the matched rule IDs. Source support for a hazard is distinct from the project's decision to label it High or Medium.

## Overrides and old manual priorities

Users may override to High, Medium, Lower or Needs Review, with a nonblank 1–300 character reason. The underlying recommendation, triggering reasons and unknown follow-up remain visible. The override records an ISO timestamp, assessment context and the last 20 applied override records. Use rule recommendation removes the active override while retaining its history.

An override applies only to the same inputs, dimensions, photo revision, evidence/notes and rule configuration. A mismatch disables it and shows that review is required. The current recommendation then applies. This prevents a stale override from silently controlling a changed assessment.

Earlier manually assigned plan priorities survive only as labelled legacy overrides when their original reason was recorded. A manual priority without a reason is not applied. Legacy records do not fill in observations or provide validated risk. Enter observations or record a new override to replace that earlier decision.

## Integration and cost separation

`WindowDraft.screening` is optional for backward compatibility and is validated during local project loading. The plan keeps its existing selection and purchasing fields. Ranking reads the screening result from the window, independently of budget, pack prices, installation cost or whether treatment is selected. Highest priority sorts **High → Needs Review → Medium → Lower**. Removed windows require review. Dashboard priority counts include plan windows even if their treatment layout needs regeneration, so stale cost quantities do not erase ecological observations.

Raw project JSON includes observations, overrides and the computed screening result for preview records; incomplete draft records retain their screening data. Readable treatment reports include the nine answers, area, evidence references, recommendation, effective priority, reasons, unknowns and source links. User text is escaped in HTML reports. Old report downloads are snapshots and must be regenerated to include this module.

Files added: `src/features/screening/{config.ts,assessment.ts,PriorityAssessment.tsx,screening.css,report.ts}` and screening tests. Integration changes: App, shared window type, local storage validation, BuildingPlan, HomePage, SiteHeader, project export and treatment report. Existing dot geometry, pricing calculations and guideline checks are reused.

## Source rationale, checked 16 October 2026

- [USFWS Bird-Friendly Building Toolkit](https://www.fws.gov/library/collections/bird-friendly-building-toolkit): identifies prior collision observations as reasons to prioritise a retrofit; discusses reflections, lighting, feeders and water sources. These support the factors and the special-attention collision rule, not a numerical prediction.
- [NParks biodiversity guidelines and resources](https://www.nparks.gov.sg/nature/enhancing-biodiversity-guidelines-resources): the Bird-safe Building Guidelines section discusses reflections/transparency, lighting management and collision monitoring. Its linked [June 2024 Bird-safe Building Guidelines](https://www.nparks.gov.sg/docs/default-source/resources/2024/bird-safety-guidelines-jun2024.pdf) provide regional context. NParks describes its guidance as non-prescriptive.
- [American Bird Conservancy, Bird-friendly Legislation & Code](https://abcbirds.org/strategies/bird-friendly-legislation-code/): discusses hazardous auxiliary glass structures, bird activity at different heights and why small panes should not be exempted. It does not validate our priority combinations or establish a pane-level m² cutoff for this software.
- [Toronto Bird-Friendly Guidelines](https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/design-guidelines/bird-friendly-guidelines/): directs readers to the companion Best Practices documents, which supersede the original 2007 guide. The [2016 Best Practices for Glass](https://www.toronto.ca/wp-content/uploads/2017/08/8d1c-Bird-Friendly-Best-Practices-Glass.pdf), especially printed pp. 18–20, 24 and 39–43, describes reflection/transparency, vegetation, architectural traps and canopy context. Historical Canadian design guidance is used here for hazard rationale, not as current Malaysian regulation or a new replacement for the team's 10/50 mm pattern baseline.

All High/Medium combinations and decision ordering are **BirdGlass project policy awaiting team/field calibration**. None of these sources should be presented as publishing or validating this exact classifier. No machine learning, additive risk score, mortality prediction or percentage estimate is used.

## Verification and remaining validation

Automated coverage includes each unknown factor, missing/invalid dimensions, conversion/recalculation, known hazards with missing answers, past-collision/treatment conflicts, unverified coverage, verified-treatment evidence, remaining lighting concerns, Other architecture, small-pane non-exemption, configurable conditions/area threshold, blank or oversized override reasons, override history/context invalidation, legacy manual records, HTML escaping, project export, local saving, sorting and budget selection independence.

Browser checks used the actual running copy: the form renders with all ten factors; a synthetic strong-reflection + very-close-vegetation example showed High with its reasons and unknown follow-up; test answers were restored to Unknown. The 390 px viewport had 375 px client/document width, with no horizontal page overflow. Screenshots labelled as interface tests are illustrative, not field findings.

Team research review, real-site observations, material/installation verification and physical-phone testing remain required. This does not replace a qualified site assessment.

Final automated validation: 197 tests passed across 24 files; npm run build passed (TypeScript + Vite). No new packages were added.

