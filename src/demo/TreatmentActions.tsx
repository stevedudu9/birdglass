import { useMemo } from 'react';
import type { WindowDraft } from '../features/member2/types';
import type { Treatment } from './planning';
import { treatmentSummary } from './treatmentSummary';
import './treatment-actions.css';

export function TreatmentActions({ window, inPlan, onAdd, onExport, onPlacement, exporting = false }: {
  window: WindowDraft; inPlan: boolean; onAdd: () => void; onExport: (treatment: Treatment) => void;
  onPlacement: (treatment: Treatment) => void; exporting?: boolean;
}) {
  const { treatment } = useMemo(() => treatmentSummary(window), [window]);
  if (!treatment) return null;
  return <section id="export-plan" className="treatment-actions-panel" aria-label="Treatment actions">
    <div className="treatment-actions">
      <button className="app-button primary-action" onClick={onAdd}>{inPlan ? 'Update building plan' : 'Add to building plan'} <span>＋</span></button>
      <button className="app-button" disabled={exporting} onClick={() => onExport(treatment)}>{exporting ? 'Preparing summary…' : 'Download treatment summary ↓'}</button>
      <button className="app-button" onClick={() => onPlacement(treatment)}>Download placement sheet ↓</button>
      <a href="#building-plan">Compare windows →</a>
    </div>
  </section>;
}
