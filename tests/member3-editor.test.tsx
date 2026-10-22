// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { BirdGlassWindowEditor } from '../src/features/member2/BirdGlassWindowEditor';
import { createWindow } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { ALGORITHM_VERSION, calculateLayout } from '../src/features/member3';

afterEach(cleanup);

it('generates through Member 2’s existing editor without changing its interface', async () => {
  let latest: WindowDraft = {
    ...createWindow('Member 3 integration'), dimensions: { width: '120', height: '70', unit: 'mm' },
    image: { imageId: 'fixture', name: 'synthetic.png', dataUrl: 'data:image/png;base64,AAAA', widthPx: 1000, heightPx: 800, orientationNormalized: true, kind: 'illustration' },
    corners: { tl: { u: .1, v: .2 }, tr: { u: .9, v: .2 }, br: { u: .9, v: .8 }, bl: { u: .1, v: .8 } },
  };
  function Harness() {
    const [value, setValue] = useState(latest);
    return <BirdGlassWindowEditor value={value} onChange={next => { latest = next; setValue(next); }} guideline={BASELINE_GUIDELINE} calculateLayout={calculateLayout} />;
  }
  render(<Harness />);
  fireEvent.click(screen.getByRole('button', { name: 'Generate preview' }));
  await waitFor(() => expect(latest.layout?.algorithmVersion).toBe(ALGORITHM_VERSION));
  expect(latest.layout?.dotCount).toBe(6);
  expect(screen.getByTestId('dot-overlay')).toBeTruthy();
  expect(latest.layout?.validation.status).toBe('incomplete');
});
