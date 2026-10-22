import { MaterialCostSummary } from '../features/materials/MaterialPlanner';
import { useId, useMemo } from 'react';
import { BOUNDARY_POLICY } from '../config/boundaryPolicy';
import type { WindowDraft } from '../features/member2/types';
import { treatmentSummary } from './treatmentSummary';
import { MeasurementCheck } from './MeasurementCheck';
import { PatternValidationStatus } from './PatternValidationStatus';
import { physicalDotPath } from './dotPath';

const number = (value: number) => Number(value.toFixed(4)).toLocaleString(undefined, { maximumFractionDigits: 4 });
const mm = (value: number | null) => value === null ? 'No neighbouring dots' : `${number(value)} mm`;

function SpacingDiagram() {
  return <svg className="m3-spacing-diagram" viewBox="0 0 440 224" role="img" aria-label="Dot spacing explained: 50 millimetres centre to centre, 40 millimetres clear gap and 10 millimetres dot diameter. The same spacing applies vertically.">
    <defs><marker id="m3-arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L8 4L0 8" fill="none" stroke="currentColor" strokeWidth="1.5"/></marker></defs>
    <path className="m3-guide" d="M120 40V125M320 40V125M140 110V175M300 110V175"/>
    <path className="m3-dimension" d="M120 45H320" markerStart="url(#m3-arrow)" markerEnd="url(#m3-arrow)"/>
    <text x="220" y="27" textAnchor="middle" className="m3-svg-strong">50 mm centre to centre</text>
    <circle cx="120" cy="110" r="20" className="m3-example-dot"/><circle cx="320" cy="110" r="20" className="m3-example-dot"/>
    <circle cx="120" cy="110" r="3" className="m3-centre"/><circle cx="320" cy="110" r="3" className="m3-centre"/>
    <path className="m3-dimension" d="M140 172H300" markerStart="url(#m3-arrow)" markerEnd="url(#m3-arrow)"/>
    <text x="220" y="199" textAnchor="middle">40 mm empty gap</text>
    <path className="m3-guide" d="M52 110H97"/>
    <text x="48" y="100" textAnchor="middle" className="m3-svg-strong">10 mm</text><text x="48" y="119" textAnchor="middle">diameter</text>
  </svg>;
}

function PhysicalLayout({ window, width, height, first }: { window: WindowDraft; width: number; height: number; first: { xMm: number; yMm: number } }) {
  const layout = window.layout!;
  const patternId = useId().replace(/:/g, '');
  const scale = Math.min(290 / width, 198 / height);
  const w = width * scale, h = height * scale;
  const x = (440 - w) / 2, y = 42 + (198 - h) / 2;
  const outline = layout.shape?.outlineMm.map((p, i) => `${i ? 'L' : 'M'}${(x + p.xMm * scale).toFixed(2)} ${(y + p.yMm * scale).toFixed(2)}`).join('') + 'Z';
  const description = layout.shape ? `${layout.dotCount} dots on a shaped pane inside a ${width} by ${height} millimetre box` : `${layout.rows} rows and ${layout.columns} columns on a ${width} by ${height} millimetre pane`;
  return <svg className="m3-pane-diagram" viewBox="0 0 440 270" role="img" aria-label={`Flat glass layout: ${description}. Each dot is drawn from the generated coordinates.`}>
    <text x="220" y="23" textAnchor="middle" className="m3-svg-strong">{number(width)} mm wide</text>
    {layout.shape ? <><rect x={x} y={y} width={w} height={h} fill="none" stroke="currentColor" strokeOpacity=".3" strokeDasharray="4 3"/><path d={outline} className="m3-glass"/></> : <rect x={x} y={y} width={w} height={h} className="m3-glass"/>}
    {layout.shape ? <path data-testid="physical-dots" d={physicalDotPath(layout.dotsMm, layout.dotDiameterMm / 2, scale, x, y)} className="m3-physical-dot"/>
      // A validated rectangle is a complete centred grid, so one repeating tile is exact.
      : <><defs><pattern id={patternId} patternUnits="userSpaceOnUse" x={x + first.xMm * scale - 25 * scale} y={y + first.yMm * scale - 25 * scale} width={50 * scale} height={50 * scale}><circle cx={25 * scale} cy={25 * scale} r={layout.dotDiameterMm * scale / 2} className="m3-physical-dot"/></pattern></defs>
        <rect x={x} y={y} width={w} height={h} fill={`url(#${patternId})`}/></>}
    <text x={x + w + 14} y={y + h / 2} dominantBaseline="middle" transform={`rotate(90 ${x + w + 14} ${y + h / 2})`} textAnchor="middle">{number(height)} mm high</text>
    <text x="220" y="262" textAnchor="middle">Flat layout · proportions follow your measurements</text>
  </svg>;
}

export function Member3Results({ window, changed, debugMode=false }: {
  window: WindowDraft; changed: boolean; debugMode?: boolean;
}) {
  const summary=useMemo(()=>treatmentSummary(window),[window]);
  const {treatment}=summary;
  if (!treatment) return <section id="pattern-results" className="member3-results" aria-label="Treatment Summary"><div className="m3-empty"><span className="eyebrow">Your window</span><h2>Treatment Summary</h2><h3>{changed ? 'Measurements changed. Generate the pattern again.' : summary.status==='fail'?'Pattern checks failed':'Prepare your window treatment'}</h3><p>{summary.status==='fail'?'The current layout needs correction. Generate a new pattern after reviewing the inputs.':changed?'Check the glass corners and dimensions, then generate again. The previous quantities are no longer used.':'Add a photo, select the four glass corners and enter the measured glass dimensions. Then generate the preview to see your quantities and layout checks.'}</p><PatternValidationStatus summary={summary} layout={window.layout}/><MaterialCostSummary window={window} compact/><dl className="treatment-facts"><div><dt>Window dimensions</dt><dd>{summary.dimensions?`${number(summary.dimensions.widthMm)} × ${number(summary.dimensions.heightMm)} mm`:'Not entered'}</dd></div><div><dt>Pattern validation</dt><dd>{summary.status==='fail'?'Failed':summary.status==='incomplete'?'Incomplete':'Not checked'}</dd></div><div><dt>Marker count and spacing</dt><dd>Unavailable until a current layout is validated</dd></div><div><dt>Material quantity estimate</dt><dd>Generate a current layout first</dd></div></dl><a href="#photo-workspace">Return to window inputs ↑</a></div></section>;
  const { request, check, quantities } = treatment;
  const gaps = check.measurements!.boundaryClearGapsMm;
  // A valid imported grid can list its dots in any order.
  const radius = window.layout!.dotDiameterMm / 2;
  const firstDot = { xMm: gaps.left + radius, yMm: gaps.top + radius };
  const edges = [['Left', gaps.left], ['Right', gaps.right], ['Top', gaps.top], ['Bottom', gaps.bottom]] as const;
  const shaped = check.measurements!.shaped;
  const shapeName = { arch: 'Arched top', raked: 'Sloped top', custom: 'Custom outline' }[window.layout!.shape?.kind ?? 'custom'];
  return <section id="pattern-results" className="member3-results" aria-label="Treatment Summary">
    <div className="m3-title"><div><span className="m3-owner">Your window treatment</span><h2>Treatment Summary</h2><p>{window.label || 'Unnamed window'} · exterior application</p></div><a className="m3-photo-link" href="#photo-workspace">View on photo ↗</a></div>
    <div className="m3-summary treatment-summary" aria-label="Treatment quantities"><div><span>Dots to apply</span><strong>{quantities.dotCount.toLocaleString()}</strong><small>White circular markers</small></div><div><span>Glass to treat</span><strong>{number(quantities.windowAreaM2)} <em>m²</em></strong><small>{shaped ? `${shapeName} within ${number(request.widthMm)} × ${number(request.heightMm)} mm` : `${number(request.widthMm)} × ${number(request.heightMm)} mm`}</small></div></div>
    <div className="m3-content"><MaterialCostSummary window={window} compact/><dl className="treatment-facts"><div><dt>Window dimensions</dt><dd>{number(request.widthMm)} × {number(request.heightMm)} mm{shaped ? ` · ${shapeName}` : ''}</dd></div><div><dt>Pattern type</dt><dd>{window.layout!.dotDiameterMm} mm white circular dots</dd></div><div><dt>Actual marker spacing</dt><dd>Horizontal: {check.measurements!.maxCenterPitchXmm===null?'Not applicable (one column)':mm(check.measurements!.maxCenterPitchXmm)}<br/>Vertical: {check.measurements!.maxCenterPitchYmm===null?'Not applicable (one row)':mm(check.measurements!.maxCenterPitchYmm)}</dd></div><div><dt>Material quantity estimate</dt><dd>{quantities.dotCount.toLocaleString()} individual dots <span>or {number(quantities.windowAreaM2)} m² of full-pane film</span><small>Before allowance, pack rounding or cutting.</small></dd></div></dl><PatternValidationStatus summary={summary} layout={window.layout}/><p>Confirm material suitability, visibility and installation conditions on site.</p>
      <details className="treatment-check-details"><summary>View spacing and edge checks</summary>
        <div className="m3-visuals"><figure><figcaption><div><h3>Your dot layout</h3><p>{shaped ? `${shaped.latticeDots.toLocaleString()} grid dots clipped to the glass outline, plus ${shaped.edgeDots.toLocaleString()} edge-coverage dots.` : `${window.layout!.rows} rows × ${window.layout!.columns} columns. Centred with equal opposite margins.`}</p></div></figcaption><PhysicalLayout window={window} width={request.widthMm} height={request.heightMm} first={firstDot}/></figure><figure><figcaption><div><h3>Understand the spacing</h3><p>Centre spacing is measured from one dot centre to the next.</p></div></figcaption><SpacingDiagram/><div className="m3-axis-values"><span>Horizontal <strong>{mm(check.measurements!.maxCenterPitchXmm)}</strong></span><span>Vertical <strong>{mm(check.measurements!.maxCenterPitchYmm)}</strong></span></div><p className="m3-figure-note">Spacing illustration. Single rows or columns have no neighbouring dots along that axis.</p></figure></div>
        {shaped ? <section className="m3-checks" aria-label="Layout checks"><h3>Edge coverage on a shaped pane</h3><p>The 50 mm grid is clipped so every dot lies completely on the glass. Edge-coverage dots then fill gaps along curved or sloping edges.</p><dl className="m3-edge-values"><div><dt>Largest gap to a dot edge</dt><dd>{mm(shaped.maxGapMm)} <span aria-label="within limit">✓</span></dd></div><div><dt>Edge limit</dt><dd>{mm(shaped.edgeLimitMm)}</dd></div><div><dt>Corner limit</dt><dd>{mm(shaped.cornerLimitMm)}</dd></div><div><dt>Edge-coverage dots</dt><dd>{shaped.edgeDots.toLocaleString()}</dd></div></dl><div className="m3-check-footer"><span>✓ Complete dots inside the outline</span><span>✓ Fixed 50 mm grid where it fits</span><span>✓ No overlapping dots</span></div><p className="m3-policy">How we check this layout: BG-EDGE-002 holds shaped panes to the same worst-case gaps that BG-EDGE-001 allows on a rectangle. It is a derived BirdGlass engineering rule awaiting team review, not an independently validated ecological threshold.</p></section> : <>
        <section className="placement-start"><h3>Where to place the first dot</h3><p>Locate its <strong>centre {number(firstDot.xMm)} mm from the left glass edge</strong> and <strong>{number(firstDot.yMm)} mm from the top glass edge</strong>. These centre offsets differ from the clear margins below.</p></section>
        <section className="m3-checks" aria-label="Layout checks"><h3>Glass-edge clearances</h3><p>Measured from each glass edge to the nearest dot edge. BirdGlass checks each against its 25 mm project limit.</p><dl className="m3-edge-values">{edges.map(([label, gap]) => <div key={label}><dt>{label} edge</dt><dd>{mm(gap)} <span aria-label="within limit">✓</span></dd></div>)}</dl><div className="m3-check-footer"><span>✓ Complete dots inside glass</span><span>✓ Fixed spacing where neighbours exist</span><span>✓ Equal opposite margins</span></div><p className="m3-policy">How we check this layout: {BOUNDARY_POLICY.id} applies a 25 mm maximum clear edge gap derived from the centred grid. This is a BirdGlass engineering rule, not an independently validated ecological threshold.</p></section></>}
      </details>
      <MeasurementCheck widthMm={request.widthMm} heightMm={request.heightMm}/>
      {debugMode&&<details className="m3-technical"><summary>Technical data</summary><dl><div><dt>First dot centre from top-left glass corner</dt><dd>({number(firstDot.xMm)}, {number(firstDot.yMm)}) mm</dd></div><div><dt>Combined circular dot area</dt><dd>{Number(quantities.totalMarkerAreaM2.toFixed(6))} m² — not the purchased film area</dd></div><div><dt>Guideline</dt><dd>{request.guidelineId} · {request.guidelineVersion}</dd></div><div><dt>Algorithm</dt><dd>{window.layout!.algorithmVersion}</dd></div><div><dt>Window / dimension revision</dt><dd>{window.windowId} / {window.dimensionRevision}</dd></div><div><dt>Layout version</dt><dd>{window.layout!.layoutVersion}</dd></div></dl></details>}
    </div>
  </section>;
}

