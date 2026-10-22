// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { buildLayoutRequest, createWindow } from '../src/features/member2/model';
import { BirdGlassWindowEditor } from '../src/features/member2/BirdGlassWindowEditor';
import type { WindowDraft } from '../src/features/member2/types';
import { calculateLayout, generatePattern } from '../src/features/member3';
import { MeasurementCheck } from '../src/demo/MeasurementCheck';
import { Member3Results } from '../src/demo/Member3Results';

afterEach(cleanup);
it('keeps the first-dot instructions and drawing origin independent of dot list order', () => {
  const draft: WindowDraft = { ...createWindow('Reordered pane'), dimensions: { width: '1200', height: '1500', unit: 'mm' }, image: { imageId: 'fixture', name: 'photo.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true, kind: 'illustration' }, corners: { tl: { u: .1, v: .1 }, tr: { u: .9, v: .1 }, br: { u: .9, v: .9 }, bl: { u: .1, v: .9 } } };
  draft.layout = generatePattern(buildLayoutRequest(draft, BASELINE_GUIDELINE), BASELINE_GUIDELINE);
  const props = { debugMode: true, changed: false, inPlan: false, onAdd: () => {}, onExport: () => {}, onPlacement: () => {} };
  const { container, rerender } = render(<Member3Results window={draft} {...props}/>);
  fireEvent.click(screen.getByText('View spacing and edge checks'));
  fireEvent.click(screen.getByText('Technical data'));
  const origin = () => {
    const pattern = container.querySelector('.m3-pane-diagram pattern')!;
    return [pattern.getAttribute('x'), pattern.getAttribute('y')];
  };
  const originalOrigin = origin();
  const dots = draft.layout.dotsMm;
  for (const dotsMm of [[...dots].reverse(), [...dots.filter((_, i) => i % 2 === 1), ...dots.filter((_, i) => i % 2 === 0)]]) {
    const savedOrder = structuredClone(dotsMm);
    rerender(<Member3Results window={{ ...draft, layout: { ...draft.layout, dotsMm } }} {...props}/>);
    expect(container.querySelector('.placement-start')!.textContent).toContain('centre 25 mm from the left glass edge');
    expect(container.querySelector('.placement-start')!.textContent).toContain('25 mm from the top glass edge');
    expect(screen.getByText('(25, 25) mm')).toBeTruthy();
    expect(origin()).toEqual(originalOrigin);
    expect(dotsMm).toEqual(savedOrder);
  }
});
it('blocks oversized panes before generation with an actionable count and unit check', () => {
  function Harness() {
    const [draft, setDraft] = useState<WindowDraft>({ ...createWindow('Large pane'), dimensions: { width: '600', height: '500', unit: 'cm' }, image: { imageId: 'fixture', name: 'photo.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true, kind: 'illustration' }, corners: { tl: { u: .1, v: .1 }, tr: { u: .9, v: .1 }, br: { u: .9, v: .9 }, bl: { u: .1, v: .9 } } });
    return <BirdGlassWindowEditor value={draft} onChange={setDraft} guideline={BASELINE_GUIDELINE} calculateLayout={calculateLayout}/>;
  }
  render(<Harness/>);
  expect(screen.getByRole('alert').textContent).toContain('12,000 dots');
  expect(screen.getByRole('alert').textContent).toContain('Check the units');
  expect((screen.getByRole('button', { name: 'Generate preview' }) as HTMLButtonElement).disabled).toBe(true);
});
it('explains count sensitivity and rejects an empty variation field', () => {
  render(<MeasurementCheck widthMm={1260} heightMm={1500}/>);
  fireEvent.click(screen.getByText('Check the effect of measurement variation'));
  expect(screen.getByText('The dot count can change within this range.')).toBeTruthy();
  expect(screen.getByText(/750–780 dots/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Try a variation of ± mm'), { target: { value: '' } });
  expect(screen.getByRole('alert').textContent).toContain('Enter the measurement variation');
  fireEvent.change(screen.getByLabelText('Try a variation of ± mm'), { target: { value: '0x10' } });
  expect(screen.getByRole('alert').textContent).toContain('decimal number');
});
it.each([[10, 10, '1'], [100000, 100000, '1'], [1200, 1500, '100000']])(
  'explains an unsupported %s × %s ±%s mm range without claiming its dot count', (widthMm, heightMm, variation) => {
    render(<MeasurementCheck widthMm={widthMm} heightMm={heightMm}/>);
    fireEvent.click(screen.getByText('Check the effect of measurement variation'));
    fireEvent.change(screen.getByLabelText('Try a variation of ± mm'), { target: { value: variation } });
    expect(screen.getByText('Cannot calculate the full range.')).toBeTruthy();
    expect(screen.getByText(/Reduce the variation or check the measured dimensions/)).toBeTruthy();
    expect(screen.queryByText('The dot count can change within this range.')).toBeNull();
    expect(screen.queryByText('The dot count stays the same within this range.')).toBeNull();
    fireEvent.change(screen.getByLabelText('Try a variation of ± mm'), { target: { value: '0' } });
    expect(screen.queryByText('Cannot calculate the full range.')).toBeNull();
    expect(screen.getByText('The dot count stays the same within this range.')).toBeTruthy();
  },
);
