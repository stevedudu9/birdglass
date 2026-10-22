# BirdGlass — team integration contract

**Members 2 + 3 integration · 15 October 2026 · schema v0.1, guideline 2026-10-15.2**

Use this document when connecting the algorithm, Ann's display, HS's costing module and the final application. It describes the current prototype. Shared TypeScript definitions in `src/features/member2/types.ts` and the profile in `src/config/baseline.ts` are the source of truth. Agree on changes together and update the relevant version.

## 1. Fixed pattern values

These are the values supplied by Jeff and used by the active prototype:

- **Shape:** circular dots in the physical glass plane.
- **Colour:** high-contrast white. The preview renders white dots.
- **Diameter:** `dotDiameterMm = 10` mm.
- **Radius:** 5 mm, calculated from the diameter.
- **Horizontal centre spacing:** `targetCenterPitchXmm = 50` mm.
- **Vertical centre spacing:** `targetCenterPitchYmm = 50` mm.
- **Spacing policy:** `fixedCenterPitch = true`. Keep actual pitch at 50 mm on axes that contain neighbouring dots. Do not stretch spacing to fit the photo or pane.
- **Calculated clear gap:** 40 mm between adjacent dot edges in either grid direction: `50 - 10 = 40`.
- **Maximum centre pitch:** `maxCenterPitchXmm = 50`, `maxCenterPitchYmm = 50`.
- **Maximum adjacent clear gap:** `maxClearGapXmm = 40`, `maxClearGapYmm = 40`.
- **Installation surface:** exterior / first surface of the glass. This is installation metadata, not something the photo preview can confirm.
- **Coverage model:** a continuous, complete rectangular grid over each selected pane; `coverageRule = "full-rectangular-grid"`.
- **Guideline ID:** `birdglass-white-10-50`.
- **Guideline version:** `2026-10-15.2`.
- **Current guideline status:** `draft`. The fixed numbers are implemented; overall rule review is still incomplete.

**Boundary policy BG-EDGE-001:** `maxBoundaryClearGapMm = 25`, defined as `glass-edge-to-dot-edge`, applied independently to all four exposed glass edges. This is a BirdGlass engineering convention derived from the centred maximal fixed-pitch grid, not a quoted CSA/FLAP threshold or an experimentally validated ecological boundary. The overall profile remains draft for final material and installation applicability review. See BOUNDARY_POLICY.md.

Single-column layouts use `actualCenterPitchXmm = null`; single-row layouts use `actualCenterPitchYmm = null`. Display N/A for those axes, rather than zero or an invented distance.

## 2. The three coordinate systems

### A. Physical glass coordinates — algorithm and costing

- Unit: **millimetres only**.
- Origin `(0, 0)`: the selected glass's **TL** corner.
- Positive X: from TL towards TR, along the physical width.
- Positive Y: from TL towards BL, along the physical height.
- Rectangle corners: `(0, 0)`, `(widthMm, 0)`, `(widthMm, heightMm)`, `(0, heightMm)`.
- Algorithm positions are **dot centres**, using `{ id, xMm, yMm }`.
- A full 10 mm dot must fit: `5 <= xMm <= widthMm - 5` and `5 <= yMm <= heightMm - 5`.
- UI entries may be mm, cm or m. Convert once: mm × 1, cm × 10, m × 1000. Retain the original input separately for reporting.
- `rows` counts positions along Y; `columns` counts positions along X.
- In the current complete-grid adapter, `dotCount = dotsMm.length = rows * columns`.

For costing, glass area is `widthMm * heightMm / 1_000_000` square metres. Photo area and dot screen size are not physical area measurements.

### B. Base-image coordinates — saved corners and projected dots

- Use `{ u, v }` normalized to **0–1**.
- `(0, 0)` is the top-left boundary of the complete base image; `(1, 1)` is its bottom-right boundary.
- U increases to the right; V increases downwards.
- The base image is the **orientation-corrected, resized image supplied in `imageAsset`**. It is not the original camera resolution and is not the editor's CSS size.
- Convert using `xPx = u * imageWidthPx` and `yPx = v * imageHeightPx`.
- Convert back using `u = xPx / imageWidthPx` and `v = yPx / imageHeightPx`.
- These are continuous image-boundary coordinates. Do not substitute `width - 1` / `height - 1` pixel-centre conventions.
- Corner names and order are always **`tl`, `tr`, `br`, `bl`**. They identify the physical rectangle corners; retain their identities even when the pane is rotated in the photo.
- Never replace saved corners with the current container coordinates or automatically reorder them using only `x + y`.

**No photo corner coordinates are globally fixed.** Each pane needs its own selection. The numeric corners in section 5 are an example, not default values for real photos.

### C. Display coordinates — UI only

- Unit: CSS pixels.
- Convert mouse/touch positions into base-image coordinates before saving them.
- Account for `contain` padding, zoom and scrolling. `pointerToNorm` already handles contain padding when given the correct image bounds.
- Browser resizing, zoom and device pixel ratio must not change measured dimensions, dot count or physical spacing.
- Keep touch/click hit areas separate from the visible physical dot outlines.

## 3. Projection contract for Ann's display

The homography maps:

```text
physical (0, 0)                 -> photo cornersNorm.tl
physical (widthMm, 0)           -> photo cornersNorm.tr
physical (widthMm, heightMm)    -> photo cornersNorm.br
physical (0, heightMm)          -> photo cornersNorm.bl
```

`makeHomography` internally uses a unit square. When calling `transformPoint` directly, pass `xMm / widthMm` and `yMm / heightMm`. The public `projectDots` helper performs this normalization for you.

Consume `PreviewResult.projectedDots`:

- `dotId`: matches the original physical dot's `id`.
- `centerNorm`: projected centre in base-image normalized coordinates.
- `outlineNorm`: ordered vertices of the projected circular boundary. Draw these as a closed filled white path.

Use `outlineNorm` to preserve physical diameter under perspective. Do not replace it with a fixed-radius screen circle. The current helper samples 48 vertices per circle; consumers should support the supplied array length without hard-coding 48.

Keep the image and overlay in the same viewBox / image transform. For example, an SVG viewBox can be `0 0 imageWidthPx imageHeightPx`, with each outline vertex multiplied by those dimensions.

Use `imageAsset` as the coordinate reference. **The exported PNG includes an added notice footer**, so its full canvas height is larger than the base-image height. Do not use the full PNG, including that footer, as a replacement coordinate base.

Required preview notice: **“Illustrative preview; not a scale installation template.”**

## 4. Required fields and ownership

### Member 2 produces `WindowInput`

- `schemaVersion`: literal string `"0.1"`.
- `buildingId`, `windowId`, `label`, `imageId`.
- `imageWidthPx`, `imageHeightPx`, `imageOrientationNormalized: true`.
- `cornersNorm: { tl, tr, br, bl }`, each containing `{ u, v }`.
- `widthMm`, `heightMm`.
- `dimensionRevision`, `photoRevision`: non-negative integers.

`imageId` must resolve to an actual asset. The current `ImageAsset` includes the normalized image as a JPEG/PNG `dataUrl`, width/height, name, orientation flag and `kind: "photo" | "illustration"`. A temporary blob URL alone is not a portable asset.

### Algorithm owner consumes `LayoutRequest`

- Echo `windowId`, `dimensionRevision`, `guidelineId`, `guidelineVersion` from the request.
- Use the provided `widthMm` and `heightMm`.
- Receive the selected `GuidelineProfile` as the provider's second argument.
- Return physical dot positions, not projected positions or screen pixels.

The algorithm does not need photo corners to calculate physical placement. Member 2 handles projection.

### Algorithm owner produces `LayoutResult`

Required fields:

- `windowId`, `dimensionRevision`, `guidelineId`, `guidelineVersion`.
- `layoutVersion`: a new non-empty version string for each newly generated layout; keep it stable while that layout is reused.
- `algorithmVersion`: identifies the implementation that actually produced the layout.
- `rows`, `columns`, `dotCount`: positive integers.
- `dotDiameterMm`, `actualCenterPitchXmm`, `actualCenterPitchYmm`.
- `dotsMm: { id: string, xMm: number, yMm: number }[]`; IDs must be unique within a layout, and coordinates finite.
- `validation: { status: "pass" | "fail" | "incomplete", issues: string[] }`.

Member 2 independently checks these values. A returned `validation.status = "pass"` does not bypass those checks. The current adapter rejects irregular / incomplete grids; agree on schema and validator changes before adding deleted dots or another layout model.

### Ann consumes the input, image and preview

Use `WindowInput`, its matching `ImageAsset` and `PreviewResult`. The preview carries `windowId`, `layoutVersion` and `photoRevision`. Display measured values from the data rather than estimating them from the photo.

### HS consumes physical input and validated layout

Use `windowId`, measured dimensions, `layoutVersion`, dot count and guideline identifiers. Cost records should also identify their pricing version. Photo corner edits do not change physical quantities or material cost. Cost implementation remains HS's module.

### Integration teammate owns the parent state

Import the public API from `src/features/member2/index.ts`. Mount `BirdGlassWindowEditor` with `value`, `onChange`, `guideline` and the optional `calculateLayout` provider. Use `key={value.windowId}` when switching windows.

Store updates against the callback's `windowId`, rather than whichever window happens to be selected later. `onInputReady` and `onPreviewReady` return null when inputs or the preview become invalid; consumers must clear their old displayed/exportable result accordingly.

## 5. Small, complete integration example

**Synthetic fixture only:** 120 × 70 mm glass, represented by a rectangle inside a 1000 × 800 px base image. The example IDs are placeholders; use the actual request IDs and revisions in real integration.

Member 2 input:

```json
{
  "schemaVersion": "0.1",
  "buildingId": "building-example-01",
  "windowId": "window-example-01",
  "label": "Integration fixture",
  "imageId": "image-example-01",
  "imageWidthPx": 1000,
  "imageHeightPx": 800,
  "imageOrientationNormalized": true,
  "cornersNorm": {
    "tl": { "u": 0.1, "v": 0.2 },
    "tr": { "u": 0.9, "v": 0.2 },
    "br": { "u": 0.9, "v": 0.8 },
    "bl": { "u": 0.1, "v": 0.8 }
  },
  "widthMm": 120,
  "heightMm": 70,
  "dimensionRevision": 3,
  "photoRevision": 2
}
```

Algorithm request:

```json
{
  "windowId": "window-example-01",
  "dimensionRevision": 3,
  "widthMm": 120,
  "heightMm": 70,
  "guidelineId": "birdglass-white-10-50",
  "guidelineVersion": "2026-10-15.2"
}
```

Matching example response from the current reference grid:

```json
{
  "windowId": "window-example-01",
  "dimensionRevision": 3,
  "guidelineId": "birdglass-white-10-50",
  "guidelineVersion": "2026-10-15.2",
  "layoutVersion": "layout-example-001",
  "algorithmVersion": "member2-reference-grid-1",
  "rows": 2,
  "columns": 3,
  "dotDiameterMm": 10,
  "actualCenterPitchXmm": 50,
  "actualCenterPitchYmm": 50,
  "dotsMm": [
    { "id": "r1c1", "xMm": 10, "yMm": 10 },
    { "id": "r1c2", "xMm": 60, "yMm": 10 },
    { "id": "r1c3", "xMm": 110, "yMm": 10 },
    { "id": "r2c1", "xMm": 10, "yMm": 60 },
    { "id": "r2c2", "xMm": 60, "yMm": 60 },
    { "id": "r2c3", "xMm": 110, "yMm": 60 }
  ],
  "dotCount": 6,
  "validation": {
    "status": "incomplete",
    "issues": [
      "Prototype layout provider; team algorithm integration and boundary-rule review are pending."
    ]
  }
}
```

Sanity checks for this fixture:

- `2 rows * 3 columns = 6 dots`.
- Adjacent centres differ by 50 mm; adjacent edge gaps are 40 mm.
- The outer dots have 5 mm clear gaps to the glass boundaries. This describes this fixture's geometry, not an approved maximum boundary gap.
- Physical glass centre `(60, 35)` maps to normalized photo `(0.5, 0.5)`, or image pixels `(500, 400)`.

The current reference provider chooses a centred fixed-spacing grid:

```text
columns = floor((widthMm  - 10) / 50) + 1
rows    = floor((heightMm - 10) / 50) + 1
startX  = (widthMm  - (columns - 1) * 50) / 2
startY  = (heightMm - (rows    - 1) * 50) / 2
xMm     = startX + columnIndex * 50
yMm     = startY + rowIndex    * 50
```

Indices start at zero. Reject panes smaller than one complete dot. These centring formulas describe the prototype provider; BG-EDGE-001 now provides a 25 mm project edge limit; material and installation applicability review remains pending.

## 6. Revision rules everyone must preserve

- **Width / height or entered unit changes:** the current editor increments `dimensionRevision`, clears the layout and requires regeneration. Even equivalent re-entry invalidates the old layout conservatively.
- **Corners change:** increment `photoRevision`; keep the same physical layout, count and `layoutVersion`; regenerate projection.
- **Photo replacement:** assign the new image asset, clear corners and layout, and increment both revisions in the current editor.
- **Guideline meaning or values change:** use a new guideline version and regenerate the layout. Do not mutate rules under an unchanged version.
- **Price changes:** HS recalculates cost under a new pricing version; physical dot coordinates are unchanged.
- **CSS resize / zoom / scroll:** rendering changes only. Physical and saved image coordinates stay unchanged.
- **Late async response:** reject it if the window, dimension revision, dimensions or guideline identifiers no longer match the request/current state.
- **Same image, multiple panes:** sharing `imageId` is allowed; each pane still has a different `windowId`, corners, dimensions, revisions and layout.

## 7. Current engineering limits

These are software limits, not bird-protection rules:

- JPEG or PNG; file size at most `12 * 1024 * 1024` bytes.
- At most 24,000,000 decoded source pixels.
- Normalized image longest edge at most 2560 px; each side at least 32 px after resizing.
- At most 10000 dots per pane and eight windows in the demo collection.
- Measured dimensions must be finite, positive and at most 100,000 mm.
- The current UI layout importer accepts at most 2,000,000 characters of JSON.
- One flat rectangular pane per record. Curved glass and major lens distortion are outside the projection model.

## 8. Next steps by teammate

1. **Algorithm owner:** adopt the request/response fields; return physical millimetre coordinates and accurate metadata; supply the actual algorithm version. Replace `src/demo/referenceLayout.ts` through the `calculateLayout` adapter. Send JSON directly from the function/API, or use the prototype's request export and layout importer for an initial manual exchange.
2. **Research owner:** review the documented BG-EDGE-001 engineering convention and final material/installation applicability. Update the versioned guideline together with the algorithm and validator when necessary.
3. **Ann:** render the matching image and `outlineNorm` data, preserve the coordinate basis, and carry measured values and the preview notice into the final presentation.
4. **HS:** consume the physical input and layout snapshot for quantities, cost and building records; preserve `windowId` and `layoutVersion` associations.
5. **Integration teammate:** mount the public component, update the correct parent record, connect the real provider, and carry the full snapshot into report generation.

Use `createHandoff(draft, guideline)` for a consistent export containing input, original dimensions, image bytes, guideline, physical layout, independent validation and projected preview. `exportPreview(handoff)` returns a PNG Blob for the report owner.

The integrated demo passed **126 tests in 15 files** and the production build. Browser checks cover the connected pattern module, 10,000-dot preview, placement export and measurement sensitivity. Field testing and merging into the latest shared team repository remain separate.


## Algorithm update, 16 October 2026

Algorithm member3-fixed-grid-1.1.0 coordinates a 10,000-dot engineering limit across generation and both validators. Shared request/response types and guideline 2026-10-15.2 are unchanged. Merge the accompanying model, validation and geometry support changes together. See PLACEMENT_UPGRADE.md for the placement sheet, constant-size grid metadata and measurement-scenario additions.

## Export performance update, 16 October 2026

The integrated editor reuses geometry for label-only changes and revalidates full handoffs at export time. JSON downloads are compact rather than pretty-printed, with the same fields, precision and all 48 outline points. Project export assembles the existing v0.1 envelope one window at a time in Blob parts and displays progress. This is not a schema or algorithm change. See PERFORMANCE_UPDATE.md in the complete Demo for merge files, measured size reduction and remaining real-phone limitations. Current complete verification: 158 tests in 19 files, TypeScript and production build checks passed.

## Smaller downloads, 16 October 2026

The optional streamed JSON.gz export restores exactly the same v0.1 JSON fields and numerical precision. Plain JSON remains available. Readable app summaries now await PNG preview generation, preserving written measurements and quantities; they are not vector fabrication templates. Await downloadTreatmentReport and handle rejected promises. The legacy synchronous buildTreatmentReport helper remains available, while normal downloads use createTreatmentReport. Shared Member 2 types, physical layout records and algorithm version are unchanged. See SMALLER_DOWNLOADS.md for the five coordinated application merge files, lossless verification and 158-test result.
