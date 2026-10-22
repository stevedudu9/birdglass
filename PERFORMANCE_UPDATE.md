# Large-window performance update — 16 October 2026

The integrated Demo now avoids rebuilding the photo projection when a window is renamed, downloads compact JSON and prepares project exports one pane at a time. The physical dot pattern and shared v0.1 handoff structure are unchanged. Real-phone performance remains unverified.

## What changed

- The editor memoizes the projected preview using its layout, corners, window/photo revision, measured dimensions and validation eligibility. Label-only changes reuse the preview. Corner changes reproject; invalid inputs clear it. Full handoffs are built and revalidated at download time, so a reused preview cannot export an old window name.
- JSON downloads omit formatting whitespace. No numerical rounding, coordinate removal or point-count reduction is performed. Unicode labels and nested data survive a download/parse round trip.
- `buildProjectData` writes the same project envelope and window records into Blob parts, one pane at a time. It no longer retains an array of every window's projected geometry before serializing the building. The collection and planning header are captured when export starts. The app yields between panes, shows preparation progress, prevents duplicate clicks and recovers from errors. Unfinished or stale windows retain their existing draft/pending representation.

This reduces simultaneous references to newly generated projection objects; it is not a measured peak-RAM guarantee. The live preview and accumulating export bytes still consume memory. Each pane's projection and serialization are synchronous, so a particularly large pane can still briefly block the main thread. All 48 outline vertices per dot remain in the shared format.

## Measured results

For the same 5000 × 5000 mm, 10000-dot placeholder-photo fixture:

| Measurement | Result |
|---|---:|
| Previous formatted handoff download | 48,275,278 bytes |
| Compact handoff download | 22,974,352 bytes |
| File-size reduction | 52.41% |
| Compact one-window project envelope | 22,976,637 bytes |
| Outline vertices retained | 480,000 |

The earlier audit's approximately 23 MB number already measured compact JSON, rather than the actual formatted download. This change brings downloads down to that compact size; it does not reduce the underlying 480,000-point geometry. Real photos add bytes, including repeated image data where required by the existing handoff schema.

See `latest-export-results.json`. Measurements exclude transfer compression and do not establish mobile rendering speed.

## Verification

- **148 regular tests passed in 18 files**, plus TypeScript checking and the production build.
- New tests cover projection reuse, correct current-label export, corner invalidation, compact JSON fidelity, complete eight-window schema preservation, asynchronous collection snapshots, unfinished/stale records, progress, duplicate-click prevention and error recovery.
- The size benchmark exercises the actual project export builder at 10000 dots and compares physical coordinates and representative full projected outlines after parsing the result.
- A separate desktop Node stress probe completed eight 10000-dot panes (80000 dots), producing 183,797,166 bytes. The recorded 2803.13 ms is one diagnostic run on this computer, not a speed guarantee. The probe uses placeholder photo data and shared physical-coordinate arrays. It does not measure a real browser's peak memory. See `Member3-eight-window-stress.json`.
- In the desktop browser, a separate illustrated 10000-dot pane generated successfully, retained its overlay when renamed/toggled and downloaded a PNG. A three-window project containing 720, 600 and 10000 dots downloaded successfully; parsing confirmed matching IDs/layout versions and all 48 outline points per dot. The actual file was 28,335,004 bytes, including its illustrations. See `Member3-performance-browser-check.json`.
- The temporary stress pane was removed after testing. The original two windows and their building plan were preserved.

The optional eight-window stress source is bundled as `docs/performance-diagnostics/large-project-stress.ts.txt`, so it cannot accidentally run in the regular suite. To reproduce, copy it to `audit/large-project-stress.test.ts` in the complete Demo, run `npm.cmd test -- audit/large-project-stress.test.ts`, and move it out again. Its output path assumes the original working-project location; adjust the `writeFileSync` target to a local diagnostic file in another checkout.

## Integration ownership

This update crosses Member 2's editor/export code and Member 1's application export. Merge the integrated files together:

- `src/features/member2/BirdGlassWindowEditor.tsx`
- `src/features/member2/export.ts`
- `src/demo/projectExport.ts` (new)
- `src/App.tsx`

The full Demo includes these files, the new tests and benchmarks. The small Member 3 module ZIP remains the algorithm integration package; it includes this note but does not include the complete editor/application patch. Shared types, the guideline, algorithm version and physical coordinates are unchanged.

## Remaining device check

Use the team's deployed app on a real phone; the current `127.0.0.1` preview URL points to this computer and cannot be used directly on another device. Test real photos, switching panes, editing corners, saving/reopening and downloading both PNG and project JSON. Gradually test larger labelled stress examples and several panes, checking for freezes, reloads and failed downloads. Preserve a backup of real work first.

An eight-pane maximum-size project is still approximately 184 MB before real-photo additions. Do not treat the completed Node stress probe or a narrow desktop viewport as proof that a phone can handle it. Keep the existing 10000-dot/eight-window caps; changing the shared preview representation or deduplicating image assets requires a coordinated format change. Real-window measurements and final material/installation review remain separate outstanding tasks.

## Browser stress follow-up

A separate-origin browser run subsequently tested eight 10000-dot illustrated panes (80000 dots), saving/reloading, switching and downloads at a 390 px viewport. The full JSON was 197627233 bytes; every physical dot coordinate, all 3840000 outline vertices and record associations were inspected. The 59253716-byte HTML report opened successfully at desktop and phone widths. All 148 automated tests passed again. This still does not establish real-phone performance. See Member3-browser-stress-test-report.md and Member3-full-browser-stress-results.json.

Latest follow-up: these measurements describe the earlier export path. Readable downloads now use PNG previews and Advanced project data offers JSON.gz. The same stress report is now 4.24 MB and the compressed project is 66.50 MB. See Member3-smaller-downloads.md for the current implementation and verification.
