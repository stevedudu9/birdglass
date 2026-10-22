import { useState } from 'react';
import { measurementSensitivity } from '../features/member3';
const number = (value: number) => Number(value.toFixed(4)).toLocaleString();

export function MeasurementCheck({ widthMm, heightMm }: { widthMm: number; heightMm: number }) {
  const [variation, setVariation] = useState('1');
  let result: ReturnType<typeof measurementSensitivity> | null = null, issue = '';
  try {
    if (!variation.trim()) throw new Error('Enter the measurement variation in millimetres.');
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(variation.trim())) throw new Error('Enter the variation as a non-negative decimal number of millimetres.');
    result = measurementSensitivity(widthMm, heightMm, Number(variation));
  } catch (error) { issue = (error as Error).message; }
  return <details className="measurement-check"><summary>Check the effect of measurement variation</summary><p>Explore how a small change in your measured width and height could change the grid. This is a scenario, not an estimate of your measurement accuracy.</p><label className="plan-field">Try a variation of ± mm<input inputMode="decimal" value={variation} maxLength={12} onChange={event => setVariation(event.target.value)}/></label>
    {issue && <p role="alert">{issue}</p>}
    {result && <>
      <div className="measurement-outcome">
        <strong>{result.countChanges === null ? 'Cannot calculate the full range.' : result.countChanges ? 'The dot count can change within this range.' : 'The dot count stays the same within this range.'}</strong>
        {result.low && result.high ? <p>{number(result.low.dotCount)}–{number(result.high.dotCount)} dots · {result.low.columns}–{result.high.columns} columns · {result.low.rows}–{result.high.rows} rows. Starting offsets may change even when the count stays the same.</p> : <p>Part of this range falls outside the supported glass dimensions (10–100,000 mm). Reduce the variation or check the measured dimensions.</p>}
        {result.countChanges === true && <p>Check the glass measurements before ordering or marking the first dot.</p>}
        {result.exceedsPreviewLimit && <p>The upper end also exceeds the current preview capacity.</p>}
      </div>
      <p>Another column fits at <strong>{number(result.nominal.nextColumnAtWidthMm)} mm width</strong>; another row fits at <strong>{number(result.nominal.nextRowAtHeightMm)} mm height</strong>, where supported.</p>
    </>}
  </details>;
}
