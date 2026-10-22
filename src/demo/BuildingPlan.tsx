import { projectEstimate, tryMaterialEstimate } from '../features/materials/estimate';
import { money } from '../features/materials/MaterialPlanner';
import { useMemo, useState } from 'react';
import type { WindowDraft } from '../features/member2/types';
import { effectiveScreening } from '../features/screening/assessment';
import { PRIORITY_LABELS } from '../features/screening/config';
import { inspectEntry, planEntry, planningViewPlan, treatmentFor } from './planning';
import type { BuildingPlan as Plan, Treatment } from './planning';

const number = (value: number) => Number(value.toFixed(4)).toLocaleString(undefined, { maximumFractionDigits: 4 });
export function BuildingPlan({ windows, plan, onChange, onEdit, onAssess, onChooseTreatment, onExport, exporting = false }: {
  windows: WindowDraft[]; plan: Plan; onChange: (value: Plan) => void;
  onEdit: (windowId: string) => void; onAssess?: (windowId:string)=>void; onChooseTreatment?: (windowId: string) => void; onExport: (items: Treatment[], includePurchasing: boolean) => void;
  exporting?: boolean;
}) {
  const [sort, setSort] = useState('added');
  const project = useMemo(() => projectEstimate(windows, planningViewPlan(plan)), [windows, plan]);
  const rows = useMemo(() => plan.entries.map(entry => inspectEntry(entry, windows)), [plan.entries, windows]);
  const selectedRows = rows.filter(row => row.entry.selected !== false);
  const valid = selectedRows.flatMap(row => row.treatment ? [row.treatment] : []);
  const area = valid.reduce((sum, item) => sum + item.quantities.windowAreaM2, 0);
  const dots = valid.reduce((sum, item) => sum + item.quantities.dotCount, 0);
  const stale = valid.length !== selectedRows.length;
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'priority') {
      const priorityWeight: Record<string, number> = { high: 4, review: 3, medium: 2, lower: 1 };
      const aP = a.draft ? priorityWeight[effectiveScreening(a.draft, a.entry).effective] ?? 0 : 0;
      const bP = b.draft ? priorityWeight[effectiveScreening(b.draft, b.entry).effective] ?? 0 : 0;
      return bP - aP;
    }
    if (sort === 'cost') {
      const aCost = a.treatment ? tryMaterialEstimate(a.treatment.draft).estimate?.indicativeSubtotal : null;
      const bCost = b.treatment ? tryMaterialEstimate(b.treatment.draft).estimate?.indicativeSubtotal : null;
      if (aCost == null) return bCost == null ? 0 : 1;
      if (bCost == null) return -1;
      return bCost - aCost;
    }
    if (sort === 'area') {
      return (b.treatment?.quantities.windowAreaM2 ?? -1) - (a.treatment?.quantities.windowAreaM2 ?? -1);
    }
    if (sort === 'dots') {
      return (b.treatment?.quantities.dotCount ?? -1) - (a.treatment?.quantities.dotCount ?? -1);
    }
    return 0;
  });

  return <section id="building-plan" className="building-plan" aria-label="Building plan">
    <div className="plan-heading">
      <div>
        <span className="eyebrow">Your building</span>
        <h2>Building Treatment Planner</h2>
        <p className="plan-subtitle">Review your assessed windows, compare treatment costs, and choose which glass surfaces to treat.</p>
      </div>
      <button
        className="app-button"
        disabled={!valid.length || stale || exporting}
        onClick={() => onExport(valid, true)}
      >
        {exporting ? 'Preparing summary…' : 'Download building summary ↓'}
      </button>
    </div>

    <label className="plan-field">Building or project name
      <input
        value={plan.name}
        maxLength={120}
        placeholder="e.g. Block A, Lakeside Residences"
        onChange={event => onChange({ ...plan, name: event.target.value })}
      />
    </label>

    {!rows.length ? (
      <div className="plan-empty">
        <h3>No windows added yet.</h3>
        <p>Start by assessing your first glass surface.</p>
        <button
          type="button"
          className="app-button assess-window-button"
          onClick={() => {
            if (windows.length && windows[0]) {
              onEdit(windows[0].windowId);
            }
            window.location.hash = '#photo-workspace';
            const target = document.getElementById('photo-workspace') || document.getElementById('studio');
            if (target) {
              target.scrollIntoView?.({ behavior: 'smooth' });
            } else {
              window.location.hash = '#photo-workspace';
            }
          }}
        >
          Assess a Window
        </button>
      </div>
    ) : (
      <>
        <div className="planner-summary-grid" aria-label="Building treatment summary">
          <div className="planner-card">
            <span className="card-label">Windows assessed</span>
            <strong className="card-value">{rows.length}</strong>
            <span className="card-note">In building plan</span>
          </div>
          <div className="planner-card">
            <span className="card-label">Windows selected for treatment</span>
            <strong className="card-value">{selectedRows.length}</strong>
            <span className="card-note">{selectedRows.length === rows.length ? 'All windows selected' : `${selectedRows.length} of ${rows.length} selected`}</span>
          </div>
          <div className="planner-card">
            <span className="card-label">Total selected glass area</span>
            <strong className="card-value">{number(area)} m²</strong>
            <span className="card-note">{number(area * 10.7639)} sq ft · <strong>{dots.toLocaleString()}</strong> dots</span>
          </div>
          <div className="planner-card">
            <span className="card-label">Indicative material cost</span>
            <strong className="card-value">{selectedRows.length && project.unknownMaterialCount === selectedRows.length ? 'Quotation required' : money(project.knownMaterialSubtotal)}</strong>
            <span className="card-note">
              {selectedRows.length === 0
                ? 'No windows selected'
                : project.unknownMaterialCount > 0
                ? `Known costs only · ${project.unknownMaterialCount} window(s) quotation required`
                : 'Selected materials subtotal'}
            </span>
          </div>
          <div className="planner-card">
            <span className="card-label">Estimated installation labour</span>
            <strong className="card-value">{selectedRows.length && project.unknownInstallationCount === selectedRows.length ? 'Quotation required' : money(project.installationSubtotal ?? project.knownLabourSubtotal)}</strong>
            <span className="card-note">
              {selectedRows.length === 0
                ? 'No windows selected'
                : project.unknownInstallationCount > 0
                ? `Known costs only · ${project.unknownInstallationCount} window(s) quotation required`
                : 'Standard / specified installation labour'}
            </span>
          </div>
          <div className="planner-card highlight-card">
            <span className="card-label">Indicative treatment subtotal</span>
            <strong className="card-value">{selectedRows.length && project.unknownMaterialCount === selectedRows.length && project.unknownInstallationCount === selectedRows.length ? 'Quotation required' : money(project.indicativeSubtotal ?? project.knownPreliminarySubtotal)}</strong>
            <span className="card-note">
              {selectedRows.length === 0
                ? 'No windows selected'
                : project.unknownAccessCount > 0
                ? `Access unpriced for ${project.unknownAccessCount} window(s)`
                : project.indicativeSubtotal === null
                ? 'Preliminary subtotal · quotes pending'
                : 'Materials + estimated labour'}
            </span>
          </div>
        </div>

        <div className="planner-exclusions-banner">
          {project.unknownAccessCount > 0 && selectedRows.length > 0 && (
            <p className="installation-pending" role="status">
              <strong>Specialist access required:</strong> {project.unknownAccessCount} selected window(s) require high-rise or difficult access. Boom lift, scaffolding, or rope-access charges are not included in this subtotal.
            </p>
          )}
          {project.extras > 0 && selectedRows.length > 0 && (
            <p className="entered-extras-note">
              Entered additional charges: <strong>{money(project.extras)}</strong>. Indicative planning total including entered charges: <strong>{project.installedTotal === null ? 'Incomplete — quotes pending' : money(project.installedTotal)}</strong>.
            </p>
          )}
          <p className="exclusions-text">
            <strong>Indicative planning estimate only:</strong> Subtotal includes selected materials and supported labour estimates. Quotes pending are shown separately. Unentered mobilisation, delivery, custom artwork, tax, equipment, and site-specific specialist access charges are excluded. Not a binding contractor quotation.
          </p>
        </div>

        {selectedRows.length === 0 && (
          <div className="plan-selection-prompt" role="status">
            <p><strong>Select the windows you want to include in your plan.</strong></p>
            <small>Check the box in the &ldquo;Treat&rdquo; column next to any assessed window below to include it in your building treatment totals.</small>
          </div>
        )}

        {stale && <p className="plan-warning" role="status">Some selected windows need updating. Totals include selected current treatments only. Regenerate their patterns and update the plan before downloading a building summary.</p>}

        <div className="plan-table-heading">
          <h3>Compare windows</h3>
          <label>Sort by{' '}
            <select value={sort} onChange={event => setSort(event.target.value)}>
              <option value="added">Order added</option>
              <option value="priority">Screening priority</option>
              <option value="cost">Estimated cost</option>
              <option value="area">Window area</option>
            </select>
          </label>
        </div>
        <p className="priority-note">
          Priorities use preliminary BirdGlass ecological screening rules and recorded user observations. Sorting is for comparison only. Costs and selection do not change ecological priority.
        </p>

        <div className="plan-table-scroll">
          <table className="plan-table">
            <thead>
              <tr>
                <th scope="col">Treat</th>
                <th scope="col">Window / location</th>
                <th scope="col">Screening priority</th>
                <th scope="col">Glass size</th>
                <th scope="col">Dots</th>
                <th scope="col">Glass area</th>
                <th scope="col">Selected material</th>
                <th scope="col">Material estimate</th>
                <th scope="col">Installation labour</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => {
                const materialEstimate = row.treatment ? tryMaterialEstimate(row.treatment.draft).estimate : null;
                const screening = row.draft ? effectiveScreening(row.draft, row.entry) : null;
                let canUpdate = false;
                try { if (row.draft) { treatmentFor(row.draft); canUpdate = true; } } catch { /* guided to regenerate first */ }
                return (
                  <tr key={row.entry.windowId} className={row.entry.selected === false ? 'row-unselected' : ''}>
                    <td data-label="Treat">
                      <input
                        type="checkbox"
                        aria-label={`Treat ${row.draft?.label || 'removed window'}`}
                        checked={row.entry.selected !== false}
                        onChange={event => onChange({
                          ...plan,
                          entries: plan.entries.map(entry => entry.windowId === row.entry.windowId ? { ...entry, selected: event.target.checked } : entry)
                        })}
                      />
                    </td>
                    <th scope="row" data-label="Window / location">
                      <strong>{row.draft?.label || 'Removed window'}</strong>
                      <input
                        aria-label={`Location for ${row.draft?.label || 'removed window'}`}
                        maxLength={120}
                        placeholder="Floor, facade or room"
                        value={row.entry.location}
                        onChange={event => onChange({
                          ...plan,
                          entries: plan.entries.map(entry => entry.windowId === row.entry.windowId ? { ...entry, location: event.target.value } : entry)
                        })}
                      />
                      {row.issue && <span className="plan-row-issue">{row.issue}</span>}
                    </th>
                    <td className="priority-cell" data-label="Screening priority">
                      <strong className={`screening-badge screening-${screening?.effective ?? 'review'}`}>
                        {PRIORITY_LABELS[screening?.effective ?? 'review']}
                      </strong>
                      <p>
                        {screening?.override || screening?.legacyOverride
                          ? 'User override · recommendation: ' + PRIORITY_LABELS[screening.recommended]
                          : 'Preliminary rule recommendation'}
                      </p>
                      {!!screening?.unknowns.length && <p>{screening.unknowns.length} observations need review</p>}
                      {(screening?.override || screening?.legacyOverride) && (
                        <p>{screening.override?.reason ?? screening.legacyOverride?.priorityReason}</p>
                      )}
                      {row.draft && (
                        <button
                          type="button"
                          aria-label={`Review screening for ${row.draft.label}`}
                          onClick={() => (onAssess ?? onEdit)(row.entry.windowId)}
                        >
                          Review screening
                        </button>
                      )}
                    </td>
                    <td data-label="Glass size">{row.treatment ? `${number(row.treatment.request.widthMm)} × ${number(row.treatment.request.heightMm)} mm` : 'Update needed'}</td>
                    <td data-label="Dots">{row.treatment?.quantities.dotCount.toLocaleString() ?? '—'}</td>
                    <td data-label="Glass area">{row.treatment ? `${number(row.treatment.quantities.windowAreaM2)} m²` : '—'}</td>
                    <td className="material-cell" data-label="Selected material">
                      <strong>{materialEstimate?.material?.name ?? 'Choose material'}</strong>
                      {row.draft && <button type="button" onClick={() => (onChooseTreatment ?? onEdit)(row.entry.windowId)}>Choose treatment</button>}
                    </td>
                    <td data-label="Material estimate">
                      <strong>{!row.treatment ? 'Update layout first' : materialEstimate?.materialCost == null ? 'Quotation required' : money(materialEstimate.materialCost)}</strong>
                      {materialEstimate?.materialCost === null && row.treatment && <small className="material-mini-info d-block">Quotation required</small>}
                    </td>
                    <td data-label="Installation labour">
                      <strong>{materialEstimate?.installationCost == null ? 'Quotation required' : money(materialEstimate.installationCost)}</strong>
                      {materialEstimate?.installation.accessRequired && materialEstimate.installation.accessCost === null && <small className="material-mini-info"> · access unpriced</small>}
                      {materialEstimate?.installation && <small className="material-mini-info d-block">{materialEstimate.installation.label}</small>}
                    </td>
                    <td data-label="Actions">
                      <div className="plan-row-actions">
                        {row.draft && <button type="button" onClick={() => onEdit(row.entry.windowId)}>Edit window</button>}
                        {row.issue && canUpdate && (
                          <button
                            type="button"
                            onClick={() => onChange({
                              ...plan,
                              entries: plan.entries.map(entry => entry.windowId === row.entry.windowId ? { ...entry, ...planEntry(row.draft!, entry.location) } : entry)
                            })}
                          >
                            Update plan
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Remove ${row.draft?.label || 'window'} from plan`}
                          onClick={() => onChange({
                            ...plan,
                            entries: plan.entries.filter(entry => entry.windowId !== row.entry.windowId)
                          })}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>


      </>
    )}
  </section>;
}

