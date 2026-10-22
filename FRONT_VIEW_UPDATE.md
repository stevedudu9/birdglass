# Front View Integration

Date: 18 October 2026. This update integrates the reviewed square Front view into the original Nature-Luxe application, alongside existing Fullscreen and high-resolution retention.

## Use

1. Open Assess, upload a window photo and select TL, TR, BR, BL.
2. Enter the actual width, height and unit. Generate the treatment overlay as usual.
3. Click **Front view**. At Fit / 100%, the entire selected pane maps corner-to-corner into a square, without side gaps or cropping.
4. Use + / - to zoom. Drag the image or focus its viewport and use arrow keys to pan. Fit restores the whole pane.
5. Hide dots / Show dots compares the corrected photo and overlay.
6. Fullscreen works in either perspective. Escape or Exit fullscreen returns to the normal workspace.
7. Original perspective returns to the uncorrected photo for corner editing and checking installation appearance.

The normal square viewer can reach 760 CSS pixels when space permits; fullscreen fits a square up to 900 pixels inside the available screen. The temporary corrected photo is 2048 x 2048 pixels. It is generated directly from the retained source through the same corner mapping as the dot overlay.

## Geometry and compatibility

Square display intentionally changes visible proportions, including dot shapes. The interface labels this as display proportions adjusted. It is an inspection view, not a physically proportioned elevation or scale installation template.

Actual dimensions, saved normalized corner coordinates, 10 mm physical dot diameter, 50 mm physical centre spacing, rows/columns/count, cost calculations and the 10000-dot cap remain unchanged. Existing saved projects require no migration. The added editor dimension prop is optional for existing PhotoStage consumers.

The original high-resolution image remains retained. Download image continues to export the original-perspective photo and projected overlay, not a square screenshot. Corner changes and dimensions are read from the current pane; unfinished correction jobs are cancelled when inputs change or the view closes.

## Verification

Final integration verification: **400 tests passed across 40 files, zero failures**. TypeScript and the Vite production build passed. This includes square-correction numerical/raster tests, front-view interaction tests, combined Front view / Fullscreen / download / cross-pane checks and the existing application regression suite. Verification was completed before applying the update.

DOM/canvas mocks and numerical checks do not replace actual browser/native-fullscreen or field calibration review. Incorrect corners, dimensions, poor photos and reflections can still make a preview misleading. Displaying more pixels does not recover missing source detail.

## Files

Application changes: PhotoStage.tsx, photo-fullscreen.css, BirdGlassWindowEditor.tsx and the new RectifiedPhoto.tsx / rectification.ts modules under src/features/member2. No dependencies were added. Supporting tests and the rebuilt static web assets are included.

The previous files are backed up inside .feature-backups in the original project before replacement. Separate Test features audit documents remain historical test records; the feature is now integrated into the main application by explicit user request.
