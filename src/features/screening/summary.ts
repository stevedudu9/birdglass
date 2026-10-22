import { normaliseInputs } from './assessment';
import type { effectiveScreening } from './assessment';
import { FACTORS } from './config';
import type { Factor } from './config';
import type { WindowDraft } from '../member2/types';

export type ReviewTarget = Factor | 'collisionEvidence' | 'treatmentEvidence' | 'notes' | 'dimensions';
export type FollowUp = { label: string; target: ReviewTarget; kind: 'missing' | 'unverified' };
export type EffectiveScreening = ReturnType<typeof effectiveScreening>;

const labels: Record<Factor, string> = {
  collisions: 'Past collisions', reflections: 'Glass reflections', transparency: 'Fly-through view',
  vegetation: 'Nearby vegetation', canopy: 'Canopy height', architecture: 'Architectural features',
  attractants: 'Bird attractants', lighting: 'Nighttime lighting', treatment: 'Existing treatment',
};
const fields = Object.keys(FACTORS) as Factor[];

/** Completeness is separate from priority: a High result can need more observations. */
export function screeningSummary(draft: WindowDraft, result: EffectiveScreening) {
  const inputs = normaliseInputs(draft.screening);
  const followUps: FollowUp[] = result.unknowns.map(label => {
    const factor = fields.find(key => FACTORS[key].label === label);
    if (factor) return { label: labels[factor], target: factor, kind: 'missing' };
    if (label === 'Measured glass area') return { label: 'Window measurements', target: 'dimensions', kind: 'missing' };
    if (label === 'Existing treatment suitability and coverage') return { label: 'Treatment suitability & coverage', target: 'treatment', kind: 'unverified' };
    if (label === 'Treatment verification record for the whole pane') return { label: 'Whole-pane treatment verification', target: 'treatmentEvidence', kind: 'unverified' };
    if (label === 'Other architectural feature: site review needed') return { label: 'Other architectural feature', target: 'notes', kind: 'unverified' };
    return { label, target: 'notes', kind: 'unverified' };
  });
  if (inputs.collisions === 'yes' && !draft.screening?.collisionEvidence?.trim()) {
    followUps.unshift({ label: 'Collision observation details', target: 'collisionEvidence', kind: 'unverified' });
  }
  const relevant = result.reasons.filter(reason => reason.id !== 'AREA-CONTEXT' && reason.id !== 'R-MISSING');
  // Show the actual matched escalation rules, without restating their individual factors.
  const high = relevant.filter(reason => reason.id.startsWith('H-'));
  const reasons = high.length ? high : relevant;
  const explanation = reasons.length ? reasons.map(reason => reason.id === 'L-OBSERVED' ? 'No escalation rule matched the completed observations.' : reason.text)
    : ['More site observations are needed to assign a screening priority.'];
  const notices = result.warnings.filter(text =>
    !text.startsWith('Unknown or unverified inputs require follow-up;') &&
    !text.startsWith('None reported is not evidence') &&
    !text.startsWith('Record the collision observation, date and evidence reference.')
  );
  return {
    followUps, explanation, notices,
    answered: fields.filter(key => inputs[key] !== 'unknown').length,
    total: fields.length,
    completeness: !followUps.length ? 'Assessment complete' : followUps.some(item => item.kind === 'missing') ? 'Assessment incomplete' : 'Verification needed',
  };
}
