# BirdGlass

BirdGlass is a bird-friendly glass planning prototype for healthier townships.

- **Live demo:** https://birdglass-demo.netlify.app
- **Team:** TerraMetrics, Universiti Malaya
- **Test report:** [TEST_REPORT.md](TEST_REPORT.md)

## Run locally

```bash
npm ci
npm run dev
```

## Run the tests

```bash
npm test
```

The documented baseline is **468 tests**. See [TEST_REPORT.md](TEST_REPORT.md) for the recorded results and verification details.

---

Latest feature update: [Front view integration](FRONT_VIEW_UPDATE.md). The complete selected pane can now fill a square display, with aligned dots, zoom/pan, Fullscreen and a return to Original perspective.

Previous feature update: [fullscreen viewing and high-resolution photo retention](FULLSCREEN_HIGH_RES_UPDATE.md). Use **Fullscreen** in the photo toolbar; upload the original photo again if the existing saved copy was previously downsized.

Latest visual update: [Nature-Luxe assessment handover](NATURE_LUXE_HANDOVER.md).

Latest interface update: see [Building Treatment Planner handover](BUILDING_PLANNER_HANDOVER.md).

> Latest update: [automatic installation labour estimates](INSTALLATION_ESTIMATOR_HANDOVER.md). Standard accessible sheet-film labour defaults to RM3.50/sq ft; DIY, conservative and difficult-access methods are selectable.

> Latest update: [automatic material selection and indicative costs](MATERIAL_ESTIMATOR_HANDOVER.md). Choose one of three Malaysian price references; installation remains separate and budget planning is optional.

> Latest public interface update: see [SIMPLIFIED_ASSESSMENT.md](SIMPLIFIED_ASSESSMENT.md). JSON tools are now debug-only; Treatment Summary uses current validated quantities and honest incomplete/unknown states.

# BirdGlass website — priority screening update

Ready-to-run React + TypeScript + Vite website with the supplied window image and preliminary per-window hazard screening. The removed homepage guidance section stays removed; source details for the new module appear within its expandable methodology panel and in PRIORITY_SCREENING.md.

## Open the website

With Node.js installed, double-click Start-BirdGlass-Web.cmd, keep its terminal open and open http://127.0.0.1:5188/#home. The included dist/ is prebuilt; no npm install is needed for this launcher. If the server is already running, refresh its existing page with Ctrl+Shift+R. Do not open index.html directly.

Open Assess, then **Screen & plan** (step 4). Complete the observations for the current window. To screen a different plan window, use its **Review screening** button. The form shows High, Medium, Lower or Needs Review, triggering reasons, unknown follow-up and any user override with a reason. Dimensions supply the area automatically. Source rationale and rule limitations are expandable. Do not select Suitable treatment verified merely because the preview contains dots.

The building plan and homepage dashboard use the same window screening data. Budget selection and supplier costs remain separate. Updated HTML treatment summaries and project JSON exports carry screening information. Existing downloads are snapshots; download them again for the new information.

## Develop and verify

- npm ci
- npm test
- npm run build
- npm run dev (use the local address Vite prints)

Validation: **197 tests passed in 24 files**; TypeScript and Vite production build passed. Desktop browser inspection confirmed all ten factors and a synthetic High result with explanatory reasons and unknown follow-up. Test answers were restored to Unknown. The 390 px responsive viewport had no horizontal page overflow. Physical-phone and field validation remain outstanding.

Rules and sources: **PRIORITY_SCREENING.md**. Configuration: src/features/screening/config.ts. Assessment logic: assessment.ts. No ML classifier, collision probability, bird-deaths estimate or validated scientific risk score is used. Source guidance supports the hazard rationale; the tier combinations remain BirdGlass project policy awaiting review.

The existing 10 mm white dots / 50 × 50 mm centre spacing and internal 25 mm boundary-gap policy are preserved. Existing Member 2 perspective geometry and Member 1 purchasing calculations are reused. No new dependencies were added.

Source, tests, built website, assets, licences, launcher, supporting docs and screenshots are included. Browser-local project data is not included. Preview screenshots use illustrated examples; the High-result screenshot is a synthetic interface test, not a field assessment. Older technical handovers are historical references; this README and PRIORITY_SCREENING.md describe the current screening module.


## Report and webpage cleanup
Removed the boundary-policy and reference-guidance footer paragraphs from newly generated treatment summaries. Removed Advanced project data and its JSON/gzip download controls from the user interface. The underlying geometry and source integration helpers remain available in the source. Existing report files do not change; generate a new summary. Validation for this cleanup: production build and 31 relevant tests passed. Two obsolete tests for the removed JSON/gzip buttons were removed. Live browser recheck was unavailable because the local preview connection failed.

