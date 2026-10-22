# Ecological screening summary — 17 October 2026

The existing screening result now shows a compact priority heading, independent assessment-completeness label and count of answered observations. Matched escalation reasons are shown without the area-context/developer text or repeated generic unknown warnings. Genuine missing or unverified items use readable list labels; the first two are visible, with remaining items expandable. A Complete Assessment action scrolls to and focuses the first missing field or evidence record; completed records offer Review Window. The scientific limitation is one subtle sentence. Conflicting collision/treatment claims and expired override notices remain visible.

## Saving investigation

The screenshot's nearly full follow-up list corresponds to unrecorded factors: normaliseInputs defaults absent answers to Unknown for display. The form updates the current WindowDraft.screening record, and the result, planner, homepage and report derive from that same window record. App navigation keeps windows in shared state; IndexedDB stores complete window records. No navigation-specific reset to Unknown was found. The photo/generation handlers use the latest window value and preserve screening fields. No storage schema, default answers or photo workflow was changed.

Regression tests check selecting answers, navigating Home/Assess, switching two windows, capturing the autosaved record, and reloading that saved record into a new application instance. These are automated application-state/saved-record tests; they are not a manual browser IndexedDB audit.

## Logic correction

Previously, a Suitable treatment verified selection without whole-pane verification evidence short-circuited hazard-rule evaluation and returned Needs Review even with strong known hazards. The corrected engine records the missing verification but continues matching the existing hazard rules. A known collision still has first precedence; existing strong combinations still produce High and individual indicators produce Medium despite unrelated unknowns. Without a hazard match, missing information remains Needs Review. A genuinely recorded suitable whole-pane treatment still suppresses the applicable glass indicators, while nighttime lighting and new collisions retain their existing attention rules.

No rule predicates, thresholds or weights were changed or added. BG-SCREEN was versioned from 1.0.0 to 1.0.1 to identify the precedence correction. Existing overrides/history remain stored; overrides created under older rules become stale through the existing context/version safeguard and require confirmation. No user-selected screening answer is replaced with Unknown. Override priority, reason/history, underlying recommendation and accurate report methodology remain available.

Completeness is derived from missing observations, valid dimensions and verification/evidence follow-up. A collision investigation can be High and have complete inputs; a High or Medium result can also have incomplete inputs. A missing collision evidence note appears as follow-up without suppressing High. Partial treatment/Other architectural-feature verification stays unresolved. Area is still automatic and has no new default threshold.

New components: src/features/screening/ScreeningSummary.tsx, summary.ts and screening-summary.css. Existing PriorityAssessment supplies controlled inputs and focus targets. Calculation engines unrelated to ecological screening, the pattern validator, sources, materials, installation and exports were not changed.

Verification: all 291 tests across 32 files passed, plus TypeScript and production build. Browser visual inspection was unavailable; no screenshot or live-browser acceptance is claimed.
