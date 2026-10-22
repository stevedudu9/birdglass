import type { WindowDraft } from '../member2/types';
import { PRIORITY_LABELS } from './config';
import { screeningSummary } from './summary';
import type { EffectiveScreening, FollowUp, ReviewTarget } from './summary';
import { Icon } from '../../site/Icon';
import './screening-summary.css';

function FollowUpList({ items }: { items: FollowUp[] }) {
  return <ul className="screening-followup-list">{items.map(item => <li key={item.label}><span>{item.label}</span><small>{item.kind === 'missing' ? 'Not recorded' : 'Needs verification'}</small></li>)}</ul>;
}

export function ScreeningSummary({ draft, result, onReview }: {
  draft: WindowDraft; result: EffectiveScreening; onReview: (target: ReviewTarget) => void;
}) {
  const summary = screeningSummary(draft, result);
  const overridden = result.override || result.legacyOverride;
  return <section className={`screening-summary-card screening-${result.effective}`} aria-label="Preliminary screening result">
    <div className="screening-summary-header">
      <div><span className="screening-summary-label">Preliminary screening priority</span><h3 aria-live="polite">{PRIORITY_LABELS[result.effective]}</h3></div>
      <div className="screening-completeness"><strong>{summary.completeness}</strong><span>{summary.answered} of {summary.total} observations recorded</span></div>
    </div>
    {overridden && <p className="screening-summary-override"><strong>Rule recommendation: {PRIORITY_LABELS[result.recommended]}.</strong> User override: {result.override?.reason ?? result.legacyOverride?.priorityReason}</p>}
    <ul className="screening-summary-reasons">{summary.explanation.slice(0, 2).map(text => <li key={text}>{text}</li>)}</ul>
    {summary.explanation.length > 2 && <details className="screening-summary-details"><summary>Other influencing factors ({summary.explanation.length - 2})</summary><ul>{summary.explanation.slice(2).map(text => <li key={text}>{text}</li>)}</ul></details>}
    {summary.notices.map(text => <p className="screening-summary-notice" key={text}>{text}</p>)}
    {summary.followUps.length > 0 && <div className="screening-summary-followup">
      <div className="screening-followup-heading"><strong>Follow-up needed:</strong><span>{summary.followUps.length} {summary.followUps.length === 1 ? 'item' : 'items'} to review</span></div>
      <FollowUpList items={summary.followUps.slice(0, 2)}/>
      {summary.followUps.length > 2 && <details className="screening-summary-details"><summary>Show {summary.followUps.length - 2} more items</summary><FollowUpList items={summary.followUps.slice(2)}/></details>}
    </div>}
    <div className="screening-summary-footer"><p>Preliminary screening, not a collision prediction or safety certification.</p>
      <button type="button" className="app-button" onClick={() => onReview(summary.followUps[0]?.target ?? 'collisions')}>{summary.followUps.length ? 'Complete Assessment' : 'Review Window'}<Icon name="arrow"/></button>
    </div>
  </section>;
}
