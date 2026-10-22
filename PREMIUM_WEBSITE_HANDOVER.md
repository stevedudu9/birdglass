# BirdGlass — premium website handover

Implemented 16 October 2026 from the supplied Option C reference, using the frontend-design skill. This is a working React + TypeScript + Vite website, with the existing assessment and planning modules connected. No new dependencies were added.

## Run and demonstrate

1. Extract the complete ZIP into a folder. Node.js must be installed.
2. Double-click **Start-BirdGlass-Web.cmd** and keep its terminal open.
3. Open **http://127.0.0.1:5188/#home**. The working tool is at **http://127.0.0.1:5188/#assess**.

The supplied `dist/` is already built; this launcher needs no npm installation. If port 5188 is already serving BirdGlass, use that existing page instead of launching a second server. Do not open index.html directly. The server binds to 127.0.0.1 only.

For development, run `npm ci`, `npm test`, `npm run build`, then `npm run dev`. Use the address Vite prints. `npm run build` includes TypeScript checking. `npm run test:watch` is also available.

A short demonstration: open the homepage, show the four process cards, drag the comparison slider, open Assess, select a pane and enter measured dimensions, regenerate, review the treatment, add/update the building plan, enter priorities with reasons and supplier prices, then download a summary. Reports are HTML with browser Print to PDF; no CAD export is claimed.

## Implemented experience

- Sticky bird-logo navigation, green calls to action and an accessible mobile menu; meaningful destinations for Home, Assess, Plan, Insights, Resources and About.
- An original glass-building hero, blue-to-green headline, subtle foliage, handwritten accent and a shared capability panel. The architectural image is explicitly labelled a concept illustration.
- Four process cards linked to the working tool. Window previews use the selected window's image and actual perspective mapping.
- A mouse/touch-compatible native comparison range with arrow-key, Home and End controls. The original photo and generated treatment share the same image geometry.
- A dashboard connected to saved window layouts, selected plan entries, user-entered priorities and purchasing calculations. It offers Project overview, Window details, Cost estimate and Pattern checks tabs with keyboard navigation.
- A coherent five-step assessment entry: Upload, Calibrate, Design, Plan and Export. Existing photo upload, corner correction, dimensions, geometric checks, multi-window planning, budgets, placement sheets and project exports remain available.
- Manrope typography, reusable colour tokens, visible focus, responsive layouts and reduced-motion CSS. Illustrations, missing quotes, stale layouts and preliminary claims are labelled explicitly.

## Files changed

New UI components and adapters: `src/site/HomePage.tsx`, `SiteHeader.tsx`, `BeforeAfterSlider.tsx`, `Icon.tsx`, `preview.ts` and `site.css`.

Shared integration: `src/App.tsx` switches between homepage and workspace while retaining loaded project state. `src/features/member2/BirdGlassWindowEditor.tsx` adds the calibration anchor. `index.html` has the new title, theme and favicon. New assets are `public/birdglass.svg` and `public/images/township-hero.png`.

Tests: new `tests/site.test.tsx`; existing collection/planning UI tests now explicitly start on the assessment route. Existing `src/web-design.css` and other earlier webpage styling remain part of the base. The prebuilt `dist/` contains the production output. See `ASSET_NOTES.md` for image sources and licences.

The algorithm, perspective maths, persistence schema, project export formats and Member 1 purchasing calculations were reused. No teammate's module was replaced by a mock.

## Verification completed

- `npm test`: **177 tests passed across 22 files**.
- `npm run build`: TypeScript and Vite production build passed.
- Browser inspection at widths **1920, 1440, 1280, 768, 430 and 390 px**. Document widths matched viewport client widths at every size; no horizontal page overflow. Mobile assessment also matched its 375 px client width at a 390 px viewport.
- Desktop and mobile screenshots were visually compared with the supplied reference. A full-page image was also inspected for section flow and clipping.
- Mobile menu opens, closes on navigation and exposes the working Quick guide. Assessment navigation retains the active window.
- Slider drag to the three-quarter position reported 75% original / 25% simulated treatment. Keyboard Home/End reported the correct extremes; the comparison was restored to 50%.
- Selecting the second saved pane updates the preview and dashboard. Window details showed the actual 720/600-dot examples. Arrow-key dashboard navigation exposed the actual entered material subtotal RM40 and installation/project subtotal RM60.
- Hero image loaded successfully; no warning/error console entries were captured during final checks.

Screenshots in `previews/` show an existing local **illustrated demonstration project** with two panes and entered example prices. Those are not site findings. Fresh browser data starts with the built-in sample, so figures may differ. Browser-local photos and saved projects are not bundled in this ZIP; use the app's project export/import to transfer a project.

## Preserved treatment baseline and limits

The team baseline remains 10 mm white circular dots, fixed 50 × 50 mm centre spacing and 40 mm clear spacing between adjacent dot edges. The centred grid keeps complete dots inside the pane. Coordinates remain millimetres from the top-left glass corner. The 25 mm maximum clear boundary gap is **BirdGlass project policy BG-EDGE-001**, not an independently validated ecological threshold. The guideline profile remains under team review.

Priorities are assigned by the team with reasons, not calculated collision probabilities. Material prices come from entered quotes. Blank prices are unknown, not free. The website does not claim certification, verified installations, bird deaths prevented or a collision-reduction percentage.

Still required before a real retrofit: review material suitability and current quotes, confirm source applicability and installation conditions, verify measurements/counts on real panes, and test performance/touch handling on physical phones. Responsive browser checks are not physical-device validation. Automatic facade detection, calibrated risk scoring, budget optimization and CAD output are not implemented. Existing limits remain eight windows and 10,000 dots per pane.

## Handover contents

Source, tests, public assets including font licence, built website, local launcher, supporting team contracts and preview screenshots are included. Dependencies, logs, browser storage and credentials are excluded. `HANDOFF_MANIFEST.json` records file lengths and SHA-256 hashes. Earlier handover documents remain as historical technical references; this guide describes the current premium website.


Window image update: the user-supplied window now replaces the old scene throughout the shared previews. Saved built-in examples migrate automatically on refresh; uploaded photos and physical measurements are preserved. See ASSET_NOTES.md for coverage and corner coordinates.

