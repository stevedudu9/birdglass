import { BASELINE_GUIDELINE } from '../config/baseline';
import type { GuidelineProfile, LayoutResult } from '../features/member2/types';
import { Icon } from '../site/Icon';
import type { treatmentSummary } from './treatmentSummary';
import './pattern-status.css';

type Summary = ReturnType<typeof treatmentSummary>;
// Exact validator messages only: an unfamiliar pending check must remain visible.
const reviewMessages = new Set([
  'The guideline profile and sources await team review.',
  'Research parameters and sources await team review.',
]);
const providerIncomplete = 'The algorithm reports incomplete checks.';

/** Presentation only. Does not replace, mutate or promote the validation result. */
export function patternValidationDisplay(summary: Summary, layout: LayoutResult | null, guideline: GuidelineProfile) {
  const providerPending = layout?.validation?.status === 'incomplete' && Array.isArray(layout.validation.issues) ? layout.validation.issues : [];
  const providerReviewOnly = providerPending.length > 0 && providerPending.every(message => reviewMessages.has(message));
  const pending = [...new Set(summary.pending.filter(message =>
    !reviewMessages.has(message) && !(message === providerIncomplete && providerReviewOnly)
  ))];
  const reviewPending = guideline.status !== 'reviewed' || !guideline.sources.length || summary.pending.some(message => reviewMessages.has(message));
  const kind = summary.status === 'fail' || summary.issues.length ? 'fail'
    : summary.treatment?.check.geometryPassed && pending.length === 0 ? 'geometry-pass'
    : summary.status === 'unknown' ? 'unknown' : 'incomplete';
  return { kind, pending, reviewPending, issues: [...new Set(summary.issues)] };
}

export function PatternValidationStatus({ summary, layout, guideline = BASELINE_GUIDELINE }: {
  summary: Summary; layout: LayoutResult | null; guideline?: GuidelineProfile;
}) {
  const display = patternValidationDisplay(summary, layout, guideline);
  const geometryPassed = display.kind === 'geometry-pass';
  const title = geometryPassed ? 'Pattern geometry checks passed'
    : display.kind === 'fail' ? 'Pattern geometry checks failed'
    : display.kind === 'unknown' ? 'Pattern geometry not checked' : 'Pattern checks incomplete';
  const messages = display.kind === 'fail' ? display.issues : display.pending;
  return <div className={`pattern-status pattern-status-${display.kind}`} role={display.kind === 'fail' ? 'alert' : 'status'}>
    <span className="pattern-status-icon" aria-hidden="true">{geometryPassed ? <Icon name="check"/> : display.kind === 'fail' ? '!' : 'i'}</span>
    <div className="pattern-status-content"><strong>{title}</strong>
      <p className="pattern-review-label">Guideline reference: {display.reviewPending ? 'Team review pending' : 'Reviewed'}</p>
      {messages.length > 0 && <ul>{messages.map(message => <li key={message}>{message}</li>)}</ul>}
      {display.kind === 'fail' && !messages.length && <p>Regenerate the pattern after checking its corners and measured dimensions.</p>}
    </div>
  </div>;
}
