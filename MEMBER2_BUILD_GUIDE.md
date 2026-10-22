# BirdGlass — Member 2 build guide

Prepared for Jeff, Member 2. Date: 15 October 2026, Malaysia time.

## Your role and delivery

You build the photo-and-projection module. A teammate will later combine the team's code. Your deliverable should therefore run independently for demonstration and expose a small, documented interface for integration.

Your workflow:

**Upload photo → select glass corners → enter measured dimensions → send algorithm input → receive dot positions → project dots onto photo → hand off data and preview.**

The stack is React + Vite + TypeScript, confirmed by Jeff. This guide records the implementation sequence. A Member 2 prototype is now present; see README.md for running and integrating it, and VERIFICATION.md for tested behavior and remaining checks.

The earlier team handoff notes are background and a proposed technical baseline. Their suggested interfaces and unconfirmed team details still need alignment with the person combining the code. Jeff's latest update fixes the relevant Member 2 pattern to 10 mm white circles with 50 × 50 mm centre spacing (40 mm calculated clear gap); the remaining update does not expand Member 2's scope.

## Responsibility boundaries

- **Jeff / Member 2:** image handling, manual corner selection, measured dimensions, coordinate conversion, projection, input state, integration outputs.
- **Algorithm owner:** physical dot layout, rows, columns, pitch, dot count. The owner's member number is not confirmed.
- **Susu / Member 4:** sourced diameter, spacing, boundary and installation rules, and pricing research.
- **Ann / Member 5:** final visual presentation and measurement display. Agree which components she supplies so the same screen is not implemented twice.
- **HS / Member 1:** cost calculations and building view.
- **Integration teammate:** assembles the modules and resolves application-level routing, styling and storage. Final report ownership remains unconfirmed.

## Build in this order

### 1. Prepare a module that runs by itself

Create a React + Vite + TypeScript project for developing and demonstrating your module. Keep the reusable feature in `src/features/member2/`; keep sample data and demo controls outside it.

Provide a single public entry file, `src/features/member2/index.ts`. The integration teammate should import from this entry rather than reaching into individual implementation files.

**Done when:** the development server opens the demo and the production build succeeds.

### 2. Write the shared input/output contract first

Start from the handoff's proposed schema version 0.1 and align it with the integration teammate and algorithm owner. Keep shared types in one place.

- Physical dimensions and algorithm dot coordinates use **millimetres**.
- Saved photo corners use **normalized coordinates from 0 to 1**, relative to the complete, orientation-corrected image.
- Corners have explicit names: `tl`, `tr`, `br`, `bl`.
- Each record carries `windowId`, `imageId`, relevant revisions and layout version.
- The image record must resolve to an actual image asset; a temporary object URL alone is not a portable handoff.

Implemented prototype component boundary (see README.md for full types):

```tsx
<BirdGlassWindowEditor
  value={windowDraft}
  onChange={handleWindowChange}
  guideline={guideline}
  calculateLayout={calculateLayout}
  onInputReady={handleInputReady}
  onPreviewReady={handlePreviewReady}
/>
```

The prototype API is implemented and documented in README.md. Align it with the team's final application before integration; keep asset ownership, units and error behavior explicit.

**Done when:** the module can consume a sample input and produce a documented output without depending on another teammate's page.

### 3. Implement photo upload

Support JPEG and PNG initially. Check format, successful decoding, file size and decoded pixel limits. Normalize image orientation and record the resulting image width and height.

Show a clear error for unsupported or unusable images. Replacing the image clears its old corners and preview. Keep image processing local in this initial module.

**Done when:** landscape and portrait images display consistently and replacing a photo cannot retain an old overlay.

### 4. Implement manual glass-corner selection

Guide the user through TL → TR → BR → BL. Allow correction by dragging each labelled handle. Select the glass boundary consistently.

Convert pointer positions from display coordinates into normalized image coordinates, including any padding introduced by `object-fit: contain`.

Reject points outside the image, duplicate points, crossing edges, non-convex shapes and nearly collapsed quadrilaterals. Request another photo when the glass boundary cannot be identified reliably.

**Done when:** resizing the display leaves all four handles on the same image locations.

### 5. Implement measured width and height

Accept mm, cm and m, convert once to millimetres, and retain the user's entered values and units. Reject blank, non-finite, zero and negative dimensions.

Explain that width corresponds to TL → TR and height to TL → BL. Use actual measurements supplied by the user.

**Done when:** equivalent inputs such as 100 cm and 1000 mm produce the same normalized dimensions.

### 6. Develop against an explicitly labelled layout fixture

Create sample `dotsMm` and metadata so your projection can be developed before the team's algorithm is available. Label these values as development data; they are not the final research rules.

Use one adapter at the module boundary to map the algorithm owner's agreed output into shared types. Validate finite coordinates, unique IDs, dot count, physical bounds and the current input revision. Unsupported or unknown rule checks must remain incomplete.

**Done when:** a valid fixture renders and malformed or stale fixtures are rejected with useful messages.

### 7. Implement perspective projection and dot outlines

Calculate the homography from the physical rectangle to the selected photo quadrilateral:

```text
(0, 0)                 → TL
(widthMm, 0)           → TR
(widthMm, heightMm)    → BR
(0, heightMm)          → BL
```

Project each dot centre and points sampled around its physical circular boundary. Draw the projected outline so apparent size and shape follow perspective.

Reject unstable or failed transforms. Keep projection coordinates separate from screen coordinates. Display: “Illustrative preview; not a scale installation template.”

**Done when:** both a front-facing and an angled glass example project correctly, including independent interior reference points.

### 8. Add preview controls and revision handling

Add show/hide dots, edit corners and reset. Ann can style the final screen using the same projected data.

- Dimension or guideline changes require a new layout and preview.
- Corner changes require a new projection while preserving the physical layout.
- Display resizing changes rendering only.
- Older asynchronous results cannot overwrite newer input.
- Invalid or outdated results cannot appear as confirmed output.

**Done when:** edits immediately invalidate affected results and resizing never changes the physical dot count.

### 9. Connect the real algorithm and expose integration outputs

Replace the fixture through the adapter once the real algorithm is available. Keep fixture mode clearly identifiable for debugging.

Give Ann the image, corners, measured dimensions and projected outlines. Give HS a validated layout with physical dimensions, count and dependency versions. Expose a structured snapshot and a preview-export function for the report owner.

Accept `windowId` from the parent application. Demonstrate switching between two windows without mixing their state; HS can own the building interface.

**Done when:** one complete window passes through upload, dimensions, real layout and preview, and consumers receive the same layout version. If the algorithm is unavailable, report that dependency explicitly.

### 10. Verify and package your handoff

Run type checking and a production build. Add targeted checks for the mathematical and state behavior that could produce convincing but incorrect previews:

- Known perspective transform with independent interior reference points.
- Invalid corners and invalid measurements.
- Equivalent unit conversions.
- Portrait orientation and responsive image positioning.
- Projected physical dot outlines.
- Stale asynchronous results and switching window IDs.
- Malformed layout output and agreed performance limits.

Give the integration teammate:

- The reusable feature folder and shared types.
- The working demo and clearly labelled fixtures.
- A README with installation, run and build commands.
- A component integration example and documented callbacks.
- The package manifest and dependency lockfile for the runnable demo.
- Verification results and a list of remaining team dependencies.

Avoid importing a second copy of React when integrating. The teammate should merge the agreed dependencies into the final application and import your public component entry.

**Done when:** the integration teammate can run your demo and mount your component without rewriting its geometry or guessing units.

## How we will handle each team request

For each request, we will identify the expected visible behavior, locate its place in this sequence, implement the smallest complete change, verify it, and state what the integration teammate needs to receive.

We can use fixtures while research or algorithm inputs are pending. Ambiguous units, spacing definitions and pricing units require the responsible teammate's clarification before their dependent logic can be finalized.

First milestone: a working editor that uploads one photo, saves four corners, accepts valid measured dimensions and emits a standardized window input. After that, complete projection with a fixture, then integrate the real layout.
