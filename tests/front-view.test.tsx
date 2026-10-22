// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { PhotoStage } from '../src/features/member2/PhotoStage';
import { rectifyPhoto } from '../src/features/member2/rectification';
import type { CornersNorm,ImageAsset,PreviewResult } from '../src/features/member2/types';
vi.mock('../src/features/member2/rectification',async()=>{
  const original=await vi.importActual<typeof import('../src/features/member2/rectification')>('../src/features/member2/rectification');
  return {...original,rectifyPhoto:vi.fn()};
});
const corners:CornersNorm={tl:{u:.2,v:.15},tr:{u:.85,v:.3},br:{u:.7,v:.9},bl:{u:.1,v:.7}};
const image:ImageAsset={imageId:'photo',name:'glass',dataUrl:'data:image/jpeg;base64,RlVMTA==',widthPx:720,heightPx:1280,orientationNormalized:true,kind:'photo'};
const preview:PreviewResult={windowId:'one',photoRevision:1,layoutVersion:'one',projectedDots:[{dotId:'one',centerNorm:{u:.5,v:.5},outlineNorm:[{u:.49,v:.5},{u:.5,v:.49},{u:.51,v:.5}]}]};
const dimensions={widthMm:1200,heightMm:1000};
afterEach(()=>{cleanup();vi.resetAllMocks();});
function mount(size:typeof dimensions|null=dimensions,selected:Partial<CornersNorm>=corners){
  const onCornersChange=vi.fn();
  const props={image,corners:selected,preview,showDots:true,editing:true,onCornersChange,dimensions:size};
  return {...render(<PhotoStage {...props}/>),props,onCornersChange};
}
it('requires four valid corners and actual dimensions',()=>{
  const app=mount(null);expect((screen.getByRole('button',{name:'Front view'}) as HTMLButtonElement).disabled).toBe(true);
  app.rerender(<PhotoStage {...app.props} dimensions={dimensions} corners={{tl:corners.tl}}/>);
  expect((screen.getByRole('button',{name:'Front view'}) as HTMLButtonElement).disabled).toBe(true);
});
it('switches to corrected glass, toggles dots, zooms and returns without modifying calibration',async()=>{
  vi.mocked(rectifyPhoto).mockResolvedValue({dataUrl:'data:image/png;base64,Q09SUkVDVEVE',width:2048,height:2048});
  const app=mount(),original=screen.getByTestId('dot-overlay').getAttribute('d');
  fireEvent.click(screen.getByRole('button',{name:'Front view'}));
  expect(await screen.findByRole('img',{name:'Front view of calibrated glass'})).toBeTruthy();
  expect(rectifyPhoto).toHaveBeenCalledWith(image,corners,1200,1000,expect.any(AbortSignal),2048,'square');
  expect(screen.queryByRole('button',{name:'Adjust TL corner'})).toBeNull();
  expect(screen.getByTestId('rectified-dot-overlay')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Hide dots'}));expect(screen.queryByTestId('rectified-dot-overlay')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Show dots'}));expect(screen.getByTestId('rectified-dot-overlay')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));expect(screen.getByText('125%')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Original perspective'}));
  expect(screen.getByTestId('dot-overlay').getAttribute('d')).toBe(original);expect(app.onCornersChange).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Adjust TL corner'})).toBeTruthy();expect(screen.getByText('100%')).toBeTruthy();
});
it('aborts a pending render when returning to the original view',async()=>{
  vi.mocked(rectifyPhoto).mockImplementation(()=>new Promise(()=>{}));mount();
  fireEvent.click(screen.getByRole('button',{name:'Front view'}));
  expect(screen.getByText('Correcting the glass perspective…')).toBeTruthy();
  const signal=vi.mocked(rectifyPhoto).mock.calls[0][4];fireEvent.click(screen.getByRole('button',{name:'Original perspective'}));
  expect(signal.aborted).toBe(true);
});
it('shows a recoverable correction error and keeps Original perspective available',async()=>{
  vi.mocked(rectifyPhoto).mockRejectedValue(new Error('Canvas unavailable'));mount();
  fireEvent.click(screen.getByRole('button',{name:'Front view'}));expect(await screen.findByRole('alert')).toHaveProperty('textContent',expect.stringContaining('Canvas unavailable'));
  fireEvent.click(screen.getByRole('button',{name:'Original perspective'}));expect(screen.queryByRole('alert')).toBeNull();
});
it('discards stale corrected results when dimensions change',async()=>{
  let resolveOld!:(value:{dataUrl:string;width:number;height:number})=>void;
  vi.mocked(rectifyPhoto).mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;})).mockResolvedValueOnce({dataUrl:'data:image/png;base64,TkVX',width:2048,height:1024});
  const app=mount();fireEvent.click(screen.getByRole('button',{name:'Front view'}));
  const oldSignal=vi.mocked(rectifyPhoto).mock.calls[0][4];
  app.rerender(<PhotoStage {...app.props} dimensions={{widthMm:2000,heightMm:1000}}/>);
  await waitFor(()=>expect(screen.getByRole('img',{name:'Front view of calibrated glass'})).toBeTruthy());
  await act(async()=>resolveOld({dataUrl:'data:image/png;base64,T0xE',width:100,height:100}));
  expect(oldSignal.aborted).toBe(true);expect(app.container.querySelector('image')?.getAttribute('href')).toBe('data:image/png;base64,TkVX');
});
it('maps the whole 950 × 18000 pane into the square without changing its dimensions or original overlay',async()=>{
  vi.mocked(rectifyPhoto).mockResolvedValue({dataUrl:'data:image/png;base64,U1FVQVJF',width:2048,height:2048,glass:{x:0,y:0,width:2048,height:2048}});
  const app=mount({widthMm:950,heightMm:18000}),original=screen.getByTestId('dot-overlay').getAttribute('d');fireEvent.click(screen.getByRole('button',{name:'Front view'}));
  const svg=await screen.findByRole('img',{name:'Front view of calibrated glass'});
  const values=()=>svg.getAttribute('viewBox')!.split(' ').map(Number);
  expect(values()).toEqual([0,0,2048,2048]);expect(screen.getByText('Whole pane · square')).toBeTruthy();
  expect(rectifyPhoto).toHaveBeenCalledWith(image,corners,950,18000,expect.any(AbortSignal),2048,'square');
  fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));
  const before=values()[1];fireEvent.keyDown(screen.getByLabelText('Corrected image viewport; drag or use arrow keys to pan when zoomed'),{key:'ArrowDown'});
  expect(values()[1]).toBeGreaterThan(before);
  expect(screen.getByTestId('rectified-dot-overlay').getAttribute('transform')).toBe('translate(0 0)');
  fireEvent.click(screen.getByRole('button',{name:'Fit'}));expect(values()).toEqual([0,0,2048,2048]);
  const boundary=screen.getByTestId('rectified-glass-boundary');expect(boundary.getAttribute('width')).toBe('2048');expect(boundary.getAttribute('height')).toBe('2048');
  expect(app.props.dimensions).toEqual({widthMm:950,heightMm:18000});expect(app.onCornersChange).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Original perspective'}));expect(screen.getByTestId('dot-overlay').getAttribute('d')).toBe(original);
});

