import { DEFAULT_INSTALLATION_METHOD, INSTALLATION_METHODS } from '../../config/installation';
import type { InstallationMethodId } from '../../config/installation';
import { MATERIAL_CATALOG, PRICING_LABELS } from '../../config/materialCatalog';
import type { MaterialOption } from '../../config/materialCatalog';
import type { WindowDraft } from '../member2/types';
import type { MaterialOverrides } from './types';
import { tryMaterialEstimate } from './estimate';
import { costSettingActive, costSettingError } from './costSettings';
import { treatmentSummary } from '../../demo/treatmentSummary';
import { Icon } from '../../site/Icon';
import { BirdSilhouette, ForestSilhouette } from './NatureLuxeVisuals';
import './materials.css';

const number = (value: number) => value.toLocaleString('en-MY', { maximumFractionDigits: 4 });
export const money = (value: number | null | undefined) => value == null ? 'Unavailable' : `RM ${value.toFixed(2)}`;
const cost = (value: number | null | undefined) => value == null ? 'Quotation required' : money(value);

/** Original CSS illustration of a treatment concept, not a product photograph. */
function MaterialPreview({ variant }: { variant: string }) {
  if (['specialist-markers','external-cords','architectural-glazing'].includes(variant)) return <div className="material-swatch material-swatch-system" aria-hidden="true"><Icon name="building"/><span>Separate treatment system</span></div>;
  return <div className={`material-swatch material-swatch-${variant}`} aria-hidden="true"><div className="material-film-sheet"/><span>Material concept</span></div>;
}

function MaterialCard({ material, selected, onSelect }: { material: MaterialOption; selected: boolean; onSelect: () => void }) {
  return <article className={`material-card ${selected ? 'is-selected' : ''}`}>
    <MaterialPreview variant={material.id}/>
    <div className="material-card-body"><h3>{material.name}</h3><p>{material.description}</p>
      <div className="material-card-rate"><strong>{money(material.unitPrice)}</strong><span>/ sq ft</span></div>
      <small className="material-price-status">{PRICING_LABELS[material.pricingStatus]}</small>
      <button type="button" className="app-button" aria-pressed={selected} aria-label={`${selected ? 'Selected' : 'Select'} ${material.name}`} onClick={onSelect}>
        {selected ? <><Icon name="check"/>Selected material</> : <>Select material<Icon name="arrow"/></>}
      </button>
    </div>
  </article>;
}

function DetailHeading({ icon, title, description }: { icon: string; title: string; description?: string }) {
  return <div className="nl-detail-heading"><span className="nl-heading-icon"><Icon name={icon}/></span><div><h3>{title}</h3>{description && <p>{description}</p>}</div></div>;
}

export function MaterialCostSummary({ window, compact = false, onInstallationChange, onAddToPlan }: {
  window: WindowDraft; compact?: boolean; onInstallationChange?: (method: InstallationMethodId) => void; onAddToPlan?: () => void;
}) {
  const { estimate, error } = tryMaterialEstimate(window);
  const material = estimate?.material;
  const installation = estimate?.installation;
  const subtotal = estimate?.indicativeSubtotal ?? (estimate && (estimate.materialCost !== null || estimate.installationCost !== null) ? estimate.preliminaryKnownSubtotal : null);

  if (compact) return <div className="material-summary-compact" aria-label="Selected treatment cost">
    <div><span>Selected treatment</span><strong>{material?.name ?? 'Choose a treatment material'}</strong></div>
    <div><span>Indicative material cost</span><strong>{cost(estimate?.materialCost)}</strong></div>
    <div><span>{estimate?.indicativeSubtotal === null ? 'Known subtotal · preliminary' : 'Indicative material + labour subtotal'}</span><strong>{cost(subtotal)}</strong><small>{installation?.missingComponents.length ? installation.missingComponents.join('; ') : 'Additional charges excluded'}</small></div>
    <a href="#choose-treatment">{material ? 'Review material & pricing' : 'Choose your glass treatment'}</a>
  </div>;

  const canAdd = !!material && !!treatmentSummary(window).treatment;
  const quantity = estimate?.chargeableQuantity == null ? 'Supplier-defined quantity' : `${number(estimate.chargeableQuantity)} ${estimate.unit}`;
  const materialCalculation = estimate?.rate != null && estimate.chargeableQuantity != null
    ? `${number(estimate.chargeableQuantity)} ${estimate.unit} × ${money(estimate.rate)} / ${estimate.unit} = ${money(estimate.baseCost)}`
    : 'A separate material quotation is needed.';
  const labourCalculation = installation?.rate != null && estimate
    ? `${estimate.areaSqft.toFixed(2)} sq ft × ${money(installation.rate)} / sq ft = ${money(installation.rawLabour)}`
    : installation?.usesQuote ? `Custom labour quotation: ${money(installation.rawLabour)}` : installation?.basis;

  return <section className="material-cost-summary nature-luxe-dashboard" aria-label="Estimated Treatment Cost">
    {onInstallationChange && <div className="nl-installation-bar">
      <span className="nl-heading-icon"><Icon name="building"/></span>
      <label htmlFor={`installation-${window.windowId}`}>Installation method</label>
      <select id={`installation-${window.windowId}`} value={window.material?.installationMethod ?? DEFAULT_INSTALLATION_METHOD} disabled={!window.material} onChange={event => onInstallationChange(event.target.value as InstallationMethodId)}>
        {INSTALLATION_METHODS.map(method => <option key={method.id} value={method.id}>{method.label} — {method.description}</option>)}
      </select>
    </div>}
    {!estimate ? <p className="material-notice" role="status">{error || 'Enter the measured window dimensions to calculate the estimate.'}</p> : <div className="nature-luxe-grid">
      <div className="nature-luxe-left">
        <div className="nl-project-material">
          <section className="nl-detail-card">
            <DetailHeading icon="building" title="Project details" description={window.label || 'Your window'}/>
            <dl className="nl-facts"><div><dt>Window dimensions</dt><dd>{number(estimate.dimensions.widthMm)} × {number(estimate.dimensions.heightMm)} mm</dd></div>
              <div><dt>Glass area</dt><dd>{number(estimate.areaSqm)} m²<small>{estimate.areaSqft.toFixed(2)} sq ft</small></dd></div></dl>
            <a className="nl-inline-link" href="#calibrate">Edit measurements<Icon name="arrow"/></a>
          </section>
          <section className="nl-detail-card nl-selected-card">
            <DetailHeading icon="leaf" title="Selected material"/>
            <div className="nl-selected-material-body"><MaterialPreview variant={material?.id ?? 'none'}/><div>
              {material && <span className="nl-selected-label">Selected</span>}
              <h4>{material?.name ?? (window.material ? 'Saved material unavailable — choose again' : 'Choose a material above')}</h4>
              {material && <p>{material.characteristics.join(' · ')}</p>}
              <a className="nl-inline-link" href="#choose-treatment">Change material<Icon name="arrow"/></a>
            </div></div>
          </section>
        </div>
        <section className="nl-detail-card">
          <DetailHeading icon="dots" title="Material & quantity" description="Measured glass, with your selected purchasing settings."/>
          <dl className="nl-facts"><div><dt>Estimated material quantity</dt><dd>{quantity}<small>{estimate.allowance ? `${estimate.allowance}% user-entered allowance` : 'Measured area; no extra allowance added'}</small></dd></div>
            <div><dt>Market reference</dt><dd>{material?.unitPrice == null ? 'Quotation required' : `${money(material.unitPrice)} / ${estimate.unit}`}<small>{material ? PRICING_LABELS[material.pricingStatus] : 'Select a treatment material'}</small></dd></div></dl>
        </section>
        <section className="nl-detail-card">
          <DetailHeading icon="chart" title="How your estimate is calculated" description="Material supply and installation are calculated separately."/>
          <div className="nl-calculation-lines">
            <div><span className="nl-calculation-label">Material calculation</span><p>{materialCalculation}</p>
              {estimate.minimumCharge !== null && <small>Minimum material charge: {money(estimate.minimumCharge)}. Applied as a floor.</small>}
              {estimate.hasOverrides && <small>{estimate.hasCustomRate ? 'Your custom rate is applied. ' : ''}Original catalogue reference retained for comparison.</small>}
            </div>
            <div><span className="nl-calculation-label">Labour calculation</span><p>{labourCalculation}</p>
              {installation!.minimumLabourCharge !== null && <small>Minimum labour charge: {money(installation!.minimumLabourCharge)}{installation!.diy ? ' (not applied to DIY)' : '. Applied as a floor.'}</small>}
            </div>
          </div>
        </section>
      </div>
      <aside className="nature-luxe-right" aria-label="Estimated project cost">
        <div className="nl-sticky-panel">
          <div className="nl-cost-art"><div className="nl-cost-title"><span className="nl-heading-icon"><Icon name="leaf"/></span><div><h3>Estimated project cost</h3><p>{window.label || 'Your window'}</p></div></div>
            <span className="nl-subtotal-label">{estimate.indicativeSubtotal === null ? 'Known subtotal · preliminary' : 'Indicative treatment subtotal'}</span>
            <strong className="nl-hero-price-amount">{cost(subtotal)}</strong>
            <BirdSilhouette className="nl-hero-bird"/><ForestSilhouette/>
          </div>
          <div className="nl-cost-content">
            <dl className="nl-panel-breakdown"><div><dt>Estimated material cost</dt><dd>{cost(estimate.materialCost)}</dd></div><div><dt>Estimated installation labour</dt><dd>{cost(estimate.installationCost)}</dd></div></dl>
            {estimate.knownExtras > 0 && <div className="nl-entered-charges"><span>Entered additional charges</span><strong>{money(estimate.knownExtras)}</strong><small>Scope including entered charges: {estimate.installedCost === null ? 'Incomplete — required charges unpriced' : money(estimate.installedCost)}</small></div>}
            <button type="button" className="app-button nl-plan-cta-button" disabled={!canAdd} onClick={() => {
              if (onAddToPlan) onAddToPlan();
              else { globalThis.window.location.hash = 'building-plan'; document.getElementById('building-plan')?.scrollIntoView?.({behavior:'smooth'}); }
            }}>Use this estimate in your plan<Icon name="arrow"/></button>
            {!canAdd && <p className="nl-action-help">{material ? 'Generate a current window pattern before adding this estimate.' : 'Select a treatment material to continue.'}</p>}
            <p className="nl-cost-notice" role="status">
              {installation!.missingComponents.length > 0 && <span>Not included: {installation!.missingComponents.join('; ')}. </span>}
              Planning assumptions, not a supplier quotation. Additional charges are separate; unquoted access, delivery, artwork, tax and equipment are excluded.
            </p>
            <details className="nl-assumptions-accordion"><summary>Additional charge details</summary><div className="nl-accordion-body">
              <dl className="nl-extra-details"><div><dt>Mobilisation</dt><dd>{installation!.mobilisationCharge === null ? 'Not entered' : money(installation!.mobilisationCharge)}</dd></div><div><dt>Delivery</dt><dd>{estimate.delivery === null ? 'Not entered' : money(estimate.delivery)}</dd></div><div><dt>Other charges</dt><dd>{estimate.other === null ? 'Not entered' : money(estimate.other)}</dd></div>
                {installation!.accessRequired && <div><dt>Difficult access</dt><dd>{installation!.accessCost === null ? 'Unpriced' : money(installation!.accessCost)}</dd></div>}</dl>
              {material && <p>{material.limitations.join(' ')}</p>}
              <p>Material artwork is illustrative. Material suitability and installation conditions require site review.</p>
            </div></details>
          </div>
        </div>
      </aside>
    </div>}
  </section>;
}

export function MaterialPlanner({
  window,
  onChange,
  onAddToPlan
}: {
  window: WindowDraft;
  onChange: (value: WindowDraft) => void;
  onAddToPlan?: () => void;
}) {
  const selection = window.material;
  const selected = MATERIAL_CATALOG.find(item => item.id === selection?.materialId);
  const settings = selection?.overrides ?? {};
  const select = (id: string) => onChange({
    ...window,
    material: selection?.materialId === id ? selection : { materialId: id }
  });

  function update(key: keyof MaterialOverrides, value: string) {
    if (selection) {
      onChange({
        ...window,
        material: {
          ...selection,
          ...(key === 'installationQuote' ? { useInstallationQuote: !!value.trim() } : {}),
          overrides: { ...settings, [key]: value }
        }
      });
    }
  }

  function installationMethod(method: InstallationMethodId) {
    if (selection) {
      onChange({
        ...window,
        material: {
          ...selection,
          installationMethod: method,
          useInstallationQuote: false
        }
      });
    }
  }

  const fields: [keyof MaterialOverrides, string, string][] = [
    ['unitPrice', `Custom unit price (RM / ${selected?.pricingModel === 'PER_SQM' ? 'm²' : 'sq ft'})`, 'Blank uses the catalogue rate'],
    ['installationQuote', 'Custom labour quote for this window (RM)', 'Optional — replaces the area labour estimate'],
    ['minimumLabourCharge', 'Minimum labour charge for this window (RM)', 'No default minimum'],
    ['mobilisationCharge', 'Mobilisation charge for this window (RM)', 'Optional — no default charge'],
    ['accessQuote', 'Access quote for this window (RM)', 'High-rise / difficult access only'],
    ['minimumOrderCharge', 'Minimum material charge (RM)', 'Optional supplier minimum'],
    ['allowancePercent', 'Material allowance (%)', '0% by default'],
    ['deliveryCharge', 'Delivery charge for this window (RM)', 'Optional entered charge'],
    ['otherCosts', 'Other costs for this window (RM)', 'Optional entered charge']
  ];

  return (
    <section id="choose-treatment" className="material-planner" aria-label="Choose Your Glass Treatment">
      {/* 2. Section Heading & Material Catalog */}
      <div className="material-section-heading">
        <div>
          <h2>Choose Your Glass Treatment</h2>
          <p>Select a material and instantly estimate your treatment cost.</p>
        </div>
        <span>Material references · Malaysia</span>
      </div>

      <div className="material-catalog">
        {MATERIAL_CATALOG.filter(item => item.category !== 'specialist').map(material => (
          <MaterialCard
            key={material.id}
            material={material}
            selected={selection?.materialId === material.id}
            onSelect={() => select(material.id)}
          />
        ))}
      </div>

      <details className="material-specialist">
        <summary>Specialist & Other Treatments</summary>
        <p>These systems require product-specific design and quotations. No Malaysian market rate is assumed.</p>
        <div>
          {MATERIAL_CATALOG.filter(item => item.category === 'specialist').map(item => (
            <button
              type="button"
              className="app-button"
              key={item.id}
              aria-pressed={selection?.materialId === item.id}
              onClick={() => select(item.id)}
            >
              <strong>{item.name}</strong>
              <span>Quotation required</span>
            </button>
          ))}
        </div>
      </details>

      {/* 3. Nature-Luxe Cost Summary Dashboard */}
      <MaterialCostSummary
        window={window}
        onInstallationChange={installationMethod}
        onAddToPlan={onAddToPlan}
      />

      {/* 4. Advanced Cost Settings */}
      <details className="material-advanced">
        <summary>Advanced Cost Settings</summary>
        <p>User-entered quotation / assumption. Blank fields keep the published reference or leave unquoted costs unavailable.</p>
        {!selection ? (
          <p>Select a material first.</p>
        ) : (
          <>
            <div className="material-advanced-fields">
              {fields.map(([key, label, placeholder]) => {
                const active = costSettingActive(selection, selected, key);
                // An unused quote remains editable: typing explicitly enables it again.
                const disabled = !active && (key !== 'installationQuote' || selection.installationMethod === 'diy');
                const error = active ? costSettingError(settings[key], key, label) : '';
                const fieldId = `cost-${window.windowId}-${key}`;
                const help = disabled ? (selection.installationMethod === 'diy' && ['installationQuote', 'minimumLabourCharge'].includes(key)
                  ? 'Not applied to DIY. Saved values are retained.'
                  : key === 'accessQuote' ? 'Only applied to high-rise / difficult access. Saved values are retained.'
                  : 'Not applicable to the selected material or installation method.')
                  : key === 'installationQuote' && !active ? 'Saved quote is not applied. Edit it or enable the checkbox below to use it.' : '';
                return <div className="plan-field" key={key}>
                  <label htmlFor={fieldId}>{label}</label>
                  <input
                    id={fieldId}
                    inputMode="decimal"
                    maxLength={20}
                    disabled={disabled}
                    aria-invalid={!!error}
                    aria-describedby={error || help ? `${fieldId}-help` : undefined}
                    value={settings[key] ?? ''}
                    placeholder={placeholder}
                    onChange={event => update(key, event.target.value)}
                  />
                  {(error || help) && <small id={`${fieldId}-help`} className={error ? 'material-field-error' : 'material-field-help'} role={error ? 'alert' : undefined}>{error || help}</small>}
                </div>;
              })}
            </div>
            {!!settings.installationQuote?.trim() && (
              <label className="installation-quote-toggle">
                <input
                  type="checkbox"
                  checked={selection.installationMethod !== 'diy' && selection.useInstallationQuote !== false}
                  disabled={selection.installationMethod === 'diy'}
                  onChange={event => onChange({
                    ...window,
                    material: { ...selection, useInstallationQuote: event.target.checked }
                  })}
                />
                Use custom labour quotation instead of the area-rate estimate
              </label>
            )}
            <p>
              Minimum labour and mobilisation apply per window. Allocate any shared call-out charge once across the selected windows. Delivery and other costs here apply to this window only. Divide a shared project charge between windows rather than entering it in full more than once.
            </p>
            <button
              type="button"
              className="app-button"
              onClick={() => onChange({ ...window, material: { materialId: selection.materialId } })}
            >
              Reset to catalogue settings
            </button>
          </>
        )}
      </details>

      <a className="material-review-link" href="#pattern-results">
        Continue to Treatment Summary ↓
      </a>
    </section>
  );
}
