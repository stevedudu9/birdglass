import { escapeHtml } from '../../demo/html';
import type { WindowDraft } from '../member2/types';
import { effectiveScreening, normaliseInputs } from './assessment';
import { FACTORS, PRIORITY_LABELS, SCREENING_SOURCES } from './config';
import type { Factor } from './config';

export function screeningReport(draft:WindowDraft,entry?:{priority?:'high'|'medium'|'low';priorityReason?:string}) {
  const result=effectiveScreening(draft,entry),inputs=normaliseInputs(draft.screening);
  const area=result.areaM2===null?'Unknown':`${Number(result.areaM2.toFixed(4))} m²`;
  const untreated=result.untreatedAreaM2===null?`Not verified; potential area up to ${area}`:`${Number(result.untreatedAreaM2.toFixed(4))} m²`;
  return `<section><h3>Preliminary hazard screening: ${PRIORITY_LABELS[result.effective]}</h3><p>Rule recommendation: ${PRIORITY_LABELS[result.recommended]}. Rules ${escapeHtml(result.configId)} v${escapeHtml(result.configVersion)}. This is BirdGlass project policy, not a validated collision probability or certification.</p>
  ${(result.override||result.legacyOverride)?`<p><strong>User override:</strong> ${escapeHtml(result.override?.reason??result.legacyOverride?.priorityReason??'')}. Recorded: ${escapeHtml(result.override?.recordedAt??'Legacy manual record; date unavailable')}.</p>`:''}
  <table><tbody>${(Object.keys(FACTORS) as Factor[]).map(key=>`<tr><th>${escapeHtml(FACTORS[key].label)}</th><td>${escapeHtml(FACTORS[key].options.find(option=>option[0]===inputs[key])![1])}</td></tr>`).join('')}<tr><th>Measured glass area</th><td>${area}</td></tr><tr><th>Untreated glass area</th><td>${untreated}</td></tr></tbody></table>
  ${(['collisionEvidence','treatmentEvidence','notes'] as const).filter(key=>draft.screening?.[key]).map(key=>`<p>${key==='collisionEvidence'?'Collision evidence':key==='treatmentEvidence'?'Whole-pane treatment verification':'Site notes'}: ${escapeHtml(draft.screening![key]!)}</p>`).join('')}
  <h4>Why this recommendation</h4><ul>${result.reasons.map(reason=>`<li>${escapeHtml(reason.id)}: ${escapeHtml(reason.text)} ${reason.sources.length?`(Rationale: ${escapeHtml(reason.sources.join(', '))})`:''}</li>`).join('')}</ul>
  ${result.unknowns.length?`<p><strong>Follow-up needed:</strong> ${escapeHtml(result.unknowns.join('; '))}.</p>`:''}<ul>${result.warnings.map(warning=>`<li>${escapeHtml(warning)}</li>`).join('')}</ul>
  <p>Screening is separate from materials, cost and budget selection. Unknown inputs are not evidence of low hazard. No bird deaths prevented or validated risk percentage is estimated.</p>
  <p>Sources: ${SCREENING_SOURCES.map(source=>`<a href="${escapeHtml(source.url)}">${escapeHtml(source.title)}</a>`).join('; ')}.</p></section>`;
}
