// @vitest-environment jsdom
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { loadProject,saveProject } from '../src/demo/storage';
import { buildLayoutRequest,createWindow } from '../src/features/member2/model';
import { makeReferenceLayout } from '../src/demo/referenceLayout';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import type { WindowDraft } from '../src/features/member2/types';
import * as reports from '../src/demo/treatmentReport';
vi.mock('../src/demo/storage',()=>({loadProject:vi.fn(),saveProject:vi.fn().mockResolvedValue(undefined)}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.clearAllMocks();vi.unstubAllGlobals();});
beforeEach(()=>{
  window.history.replaceState({},'', '#assess');
  const draft:WindowDraft={...createWindow('Original pane'),image:{imageId:'same-photo',name:'photo.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'photo'},
    dimensions:{width:'12',height:'15',unit:'cm'},corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
  draft.layout=makeReferenceLayout(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);
  vi.mocked(loadProject).mockResolvedValue({version:1,windows:[draft],activeId:draft.windowId});
});
it('keeps photo, corners, dimensions and layout separate when switching windows',async()=>{
  render(<App/>);const user=userEvent.setup();await screen.findByDisplayValue('Original pane');
  await user.click(screen.getByRole('button',{name:/Add window/}));expect((screen.getByLabelText('Measured width') as HTMLInputElement).value).toBe('');expect(screen.queryByTestId('dot-overlay')).toBeNull();
  await user.type(screen.getByLabelText('Measured width'),'80');await user.type(screen.getByLabelText('Measured height'),'100');
  await user.click(screen.getByRole('button',{name:/^Original pane/}));
  expect((screen.getByLabelText('Measured width') as HTMLInputElement).value).toBe('12');expect(screen.queryByTestId('dot-overlay')).not.toBeNull();
  await user.click(screen.getByRole('button',{name:/^Window 2/}));
  expect((screen.getByLabelText('Measured width') as HTMLInputElement).value).toBe('80');expect(screen.queryByTestId('dot-overlay')).toBeNull();
});
it('reuses the same image asset for another pane while clearing its selection and measurements',async()=>{
  render(<App/>);const user=userEvent.setup();await screen.findByDisplayValue('Original pane');
  await user.click(screen.getByRole('button',{name:'Another pane in this photo'}));
  expect(screen.getByRole('group',{name:'Window photo and perspective dot overlay'})).toBeTruthy();
  expect(screen.queryByTestId('dot-overlay')).toBeNull();expect((screen.getByLabelText('Measured width') as HTMLInputElement).value).toBe('');
  await waitFor(()=>expect(vi.mocked(saveProject).mock.lastCall?.[0].windows).toHaveLength(2));
  const snapshot=vi.mocked(saveProject).mock.lastCall![0];expect(snapshot.windows).toHaveLength(2);
  expect(snapshot.windows[0].image?.imageId).toBe(snapshot.windows[1].image?.imageId);expect(snapshot.windows[1].corners).toEqual({});
});
it('restores a removed window through undo',async()=>{
  render(<App/>);const user=userEvent.setup();await screen.findByDisplayValue('Original pane');
  await user.click(screen.getByRole('button',{name:'Remove this window'}));expect(screen.queryByDisplayValue('Original pane')).toBeNull();
  await user.click(screen.getByRole('button',{name:'Undo removal'}));expect(screen.getByDisplayValue('Original pane')).toBeTruthy();expect(screen.getByTestId('dot-overlay')).toBeTruthy();
});
it('preserves saved data and reports failure if storage cannot be read',async()=>{
  vi.mocked(loadProject).mockRejectedValue(new Error('Saved project format is invalid. Autosave is paused to preserve it.'));
  render(<App/>);await screen.findByText('Saved project format is invalid. Autosave is paused to preserve it.');
  expect(vi.mocked(saveProject)).not.toHaveBeenCalled();
});
it('awaits a readable report and recovers when preview generation fails',async()=>{
  let finish:()=>void=()=>{};
  const build=vi.spyOn(reports,'downloadTreatmentReport').mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  render(<App/>);await screen.findByDisplayValue('Original pane');
  fireEvent.click(screen.getByRole('button',{name:'Download treatment summary ↓'}));
  expect(screen.getByText('Preparing treatment summary…')).toBeTruthy();
  expect(screen.getAllByRole('button',{name:'Preparing summary…'}).every(button=>(button as HTMLButtonElement).disabled)).toBe(true);
  expect(screen.queryByText(/Treatment summary downloaded/)).toBeNull();
  await act(async()=>{finish();});
  expect(screen.getByText(/Treatment summary downloaded/)).toBeTruthy();
  build.mockRejectedValueOnce(new Error('PNG render failed'));
  fireEvent.click(screen.getByRole('button',{name:'Download treatment summary ↓'}));
  await screen.findByText('Summary could not be created. PNG render failed');
  expect((screen.getByRole('button',{name:'Download treatment summary ↓'}) as HTMLButtonElement).disabled).toBe(false);
});

