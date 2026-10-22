// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { HomePage } from '../src/site/HomePage';
import { SiteHeader } from '../src/site/SiteHeader';
import { BeforeAfterSlider } from '../src/site/BeforeAfterSlider';
import { photoPreview } from '../src/site/preview';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { buildLayoutRequest, createWindow } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { emptyPlan, planEntry } from '../src/demo/planning';
import { loadProject } from '../src/demo/storage';

vi.mock('../src/demo/storage',()=>({loadProject:vi.fn(),saveProject:vi.fn().mockResolvedValue(undefined)}));
beforeEach(()=>window.history.replaceState({},'', '#home'));
afterEach(()=>{cleanup();vi.clearAllMocks();});

function fixture(label='Example pane'):WindowDraft {
  const draft:WindowDraft={...createWindow(label),dimensions:{width:'120',height:'150',unit:'cm'},
    image:{imageId:label,name:'example.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'illustration'},
    corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
  draft.layout=generatePattern(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
}

it('uses saved per-window material costs consistently with the public planner',()=>{
  const a=fixture('Lobby'),b=fixture('Courtyard');
  a.material={materialId:'standard-dot-film',overrides:{}};b.material={materialId:'standard-dot-film',overrides:{}};
  const plan={...emptyPlan(),costMode:'legacy' as const,entries:[{...planEntry(a),priority:'high' as const,priorityReason:'Recorded field observation'},planEntry(b)],purchasing:{...emptyPlan().purchasing,format:'dots' as const,dotsPerPack:'1000',packPrice:'20'}};
  render(<HomePage windows={[a,b]} current={a} plan={plan} ready/>);
  expect(screen.getByRole('img',{name:/2 windows in the plan/}).getAttribute('aria-label')).toContain('1 High priority');
  expect(screen.getByText('RM 348.75')).toBeTruthy();
  expect(screen.getByText(/Illustrated examples are included/)).toBeTruthy();
  fireEvent.click(screen.getByRole('tab',{name:'Window details'}));
  const panel=screen.getByRole('tabpanel');
  expect(within(panel).getByText('Lobby')).toBeTruthy();
  expect(within(panel).getByText('Courtyard')).toBeTruthy();
  expect(within(panel).getAllByText('720')).toHaveLength(2);
  fireEvent.keyDown(screen.getByRole('tab',{name:'Window details'}),{key:'ArrowRight'});
  const costTab=screen.getByRole('tab',{name:'Cost estimate'});
  expect(costTab.getAttribute('aria-selected')).toBe('true');
  expect(document.activeElement).toBe(costTab);
  expect(within(screen.getByRole('tabpanel')).getByText('RM 348.75')).toBeTruthy();
});

it('never substitutes an old overlay or a complete cost for a stale layout',()=>{
  const original=fixture(),stale={...original,dimensionRevision:original.dimensionRevision+1};
  expect(photoPreview(stale)).toBeNull();
  render(<HomePage windows={[stale]} current={stale} plan={{...emptyPlan(),entries:[planEntry(original)]}} ready/>);
  expect(screen.queryByRole('slider')).toBeNull();
  expect(screen.getByText('Update layouts')).toBeTruthy();
  expect(screen.getByText(/Some selected treatments need updating/)).toBeTruthy();
});

it('keeps missing prices explicit instead of displaying a zero-cost treatment',()=>{
  const draft=fixture();render(<HomePage windows={[draft]} current={draft} plan={{...emptyPlan(),entries:[planEntry(draft)]}} ready/>);
  expect(screen.getByText('Choose materials / review costs')).toBeTruthy();expect(screen.queryByText('RM 0.00')).toBeNull();
});

it('moves the comparison clip and its accessible description using the same image geometry',()=>{
  const preview=photoPreview(fixture())!;const {container}=render(<BeforeAfterSlider preview={preview}/>);
  const slider=screen.getByRole('slider',{name:'Before and after comparison'});
  fireEvent.change(slider,{target:{value:'75'}});
  expect(slider.getAttribute('aria-valuetext')).toBe('75% original, 25% simulated treatment');
  expect(container.querySelector('clipPath rect')!.getAttribute('x')).toBe('750');
  expect(container.querySelector('clipPath rect')!.getAttribute('width')).toBe('250');
  expect(screen.getByTestId('comparison-dots').getAttribute('d')).toBe(preview.outline);
});

it('opens and closes navigation with a keyboard escape and returns focus',async()=>{
  const {rerender}=render(<SiteHeader hash="#home" onGuide={()=>{}} guideOpen={false}/>);const user=userEvent.setup();
  const nav=within(screen.getByRole('navigation',{name:'Main navigation'}));
  for(const name of ['Plan','Insights','About'])expect(nav.queryByRole('link',{name})).toBeNull();
  await user.click(screen.getByRole('button',{name:'Open navigation'}));
  const close=screen.getByRole('button',{name:'Close navigation'});expect(close.getAttribute('aria-expanded')).toBe('true');
  fireEvent.keyDown(screen.getByRole('navigation',{name:'Main navigation'}),{key:'Escape'});
  const open=screen.getByRole('button',{name:'Open navigation'});expect(open.getAttribute('aria-expanded')).toBe('false');expect(document.activeElement).toBe(open);
  rerender(<SiteHeader hash="#building-plan" onGuide={()=>{}} guideOpen={false}/>);
  expect(nav.getByRole('link',{name:'Assess'}).getAttribute('aria-current')).toBe('page');
  expect(nav.getByRole('link',{name:'Home'}).getAttribute('aria-current')).toBeNull();
});

it('moves between homepage and assessment without discarding an edited window',async()=>{
  const draft=fixture(),second=fixture('Second pane');vi.mocked(loadProject).mockResolvedValue({version:1,windows:[draft,second],activeId:draft.windowId});
  const {container}=render(<App/>);const user=userEvent.setup();await screen.findByRole('slider');
  await user.selectOptions(screen.getByLabelText('Preview window'),second.windowId);
  await user.click(within(container.querySelector('.home-hero')!).getByRole('link',{name:'Start Assessment'}));
  const name=await screen.findByLabelText('Window name');expect((name as HTMLInputElement).value).toBe('Second pane');fireEvent.change(name,{target:{value:'Edited project pane'}});
  await user.click(within(screen.getByRole('navigation',{name:'Main navigation'})).getByRole('link',{name:'Home'}));
  await screen.findByRole('heading',{name:'Bird-Friendly Buildings for Healthier Townships'});
  expect(within(screen.getByRole('tabpanel')).getByText('Edited project pane')).toBeTruthy();
  await user.click(within(screen.getByRole('navigation',{name:'Main navigation'})).getByRole('link',{name:'Assess'}));
  expect((await screen.findByLabelText('Window name') as HTMLInputElement).value).toBe('Edited project pane');
  expect(screen.getByTestId('dot-overlay')).toBeTruthy();
  expect(vi.mocked(loadProject)).toHaveBeenCalledTimes(1);
});

