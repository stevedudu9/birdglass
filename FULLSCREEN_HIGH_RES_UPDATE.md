# Fullscreen and high-resolution photo update

Date: 18 October 2026.

This update adds fullscreen photo viewing and retention of native image resolution to the existing Nature-Luxe application.

## Use the features

1. Start the existing `Start-BirdGlass-Web.cmd` launcher and open its local URL.
2. Open Assess and upload a JPEG or PNG.
3. Use **Fullscreen** in the photo toolbar to enlarge the photo workspace. Zoom, Fit and corner editing continue to work in this view.
4. Choose **Exit fullscreen** or press **Esc** to return. Browser-initiated fullscreen exit also restores the normal workspace.
5. The toolbar reports the retained image width and height in pixels. Fullscreen and zoom use the full-resolution image; the fitted overview uses a smaller copy when available.
6. Generate a preview as usual. The existing **Download image** action renders from the full-resolution image and its matching coordinate basis.

Browsers that cannot enter native fullscreen use a viewport-filling presentation with the same exit controls. Focus stays within that expanded view, and page scrolling is restored on exit. The implementation follows the [Fullscreen API](https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen) and [fullscreen-change event](https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenchange_event).

## What image retention means here

- The complete orientation-corrected image is retained at its decoded pixel dimensions. It is no longer automatically reduced to a 2,560 px longest edge.
- `ImageAsset.dataUrl`, `widthPx` and `heightPx` describe this full-resolution base image.
- An optional `ImageAsset.preview` contains a lightweight copy with a longest edge of at most 2,560 px. It represents the same complete image, without cropping.
- Saved corners and projected dots remain normalized relative to the complete full-resolution base image. Switching between copies changes image detail, not their coordinate positions.
- Small fitted previews, thumbnails and homepage comparisons use the lightweight copy. Fullscreen, zoom, image downloads and image-bearing exports use or retain the full-resolution base image.
- PNG base images use PNG encoding. JPEG base images are orientation-normalized and re-encoded at quality 0.96. This preserves native resolution; it is not byte-for-byte preservation of the original file, EXIF metadata or original JPEG compression.
- Temporary processing and export canvases are released after use to reduce memory retained by large-image operations.

## Limits and existing projects

The existing **12 MB source-file**, **24-megapixel decoded-image**, physical-dimension and **10,000-dot** limits remain. Native image dimensions are supported up to a 12,000 px longest edge, subject to the 24-megapixel limit and at least 32 px per side. Unsupported native dimensions produce an explicit error rather than silent reduction.

Existing saved assets without `preview` remain supported and use their existing image data. Previously discarded resolution cannot be restored from those saved copies. Re-upload the original high-resolution photo to retain its detail; photo replacement follows the existing reset-and-reselect-corners behavior.

Keeping larger images can increase local storage and export sizes. Existing storage-error messages still report browser storage failures. The normal overview remains a screen-sized view: retaining a detailed source does not make thousands of small dots individually readable at every fitted screen scale.

## Integration

`ImageAsset` adds one optional property:

```ts
preview?: {
  dataUrl: string;
  widthPx: number;
  heightPx: number;
};
```

Always use the outer `widthPx` / `heightPx` as the coordinate basis. A preview may be displayed within that same image viewBox, but its smaller dimensions must not replace the saved coordinate basis. Old assets need no schema migration.

Physical dot diameter, physical spacing, boundary policy, rows/columns calculation, costing, screening, reports' written quantities and the 10,000-dot cap are not changed by this update.

## Verification

The unmodified project passed 345 tests before implementation. New tests cover native fullscreen, fallback fullscreen, Escape / browser exits, keyboard focus, zoom and corner-coordinate stability, native JPEG/PNG resolution, overview generation, legacy saved-image compatibility, retained-image input checks and full-resolution PNG export.

Final automated verification: **366 tests passed across 36 files**, including the 345 original tests; TypeScript checking and the Vite production build passed. No dependencies were added. Browser UI inspection is still required on the user's browser for native fullscreen appearance and real high-resolution photo operation; DOM and canvas mocks do not verify actual GPU pixels or native browser permission behavior.
