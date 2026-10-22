// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NatureWorkspaceHero } from '../src/site/NatureWorkspaceHero';
import { MaterialCostSummary, MaterialPlanner } from '../src/features/materials/MaterialPlanner';
import { createWindow, buildLayoutRequest, setDimensions } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { useState } from 'react';

afterEach(cleanup);
function fixture(): WindowDraft {
 const draft:WindowDraft={...createWindow('Garden pane'),material:{materialId:'premium-clear-film'},dimensions:{width:'1200',height:'1500',unit:'mm'},
 image:{imageId:'fixture',name:'window.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'photo'},
 corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
 draft.layout=generatePattern(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
}
it('uses the requested assessment headline and a working return-home link',()=>{
 render(<NatureWorkspaceHero/>);
 expect(screen.getByRole('heading',{level:1}).textContent).toContain('Assess your glass.');
 expect(screen.getByRole('heading',{level:1}).textContent).toContain('Create a safer tomorrow.');
 expect(screen.getByRole('link',{name:/Back to BirdGlass/}).getAttribute('href')).toBe('#home');
});
it('shows one concise live subtotal and keeps charge details collapsed',async()=>{
 const draft=fixture(),onAdd=vi.fn(),original=structuredClone(draft);
 const {container}=render(<MaterialCostSummary window={draft} onAddToPlan={onAdd}/>);
 const aside=within(screen.getByRole('complementary',{name:'Estimated project cost'}));
 expect(aside.getByText('RM 300.31')).toBeTruthy();
 expect(aside.getByText('RM 232.50')).toBeTruthy();expect(aside.getByText('RM 67.81')).toBeTruthy();
 expect(container.querySelectorAll('.nl-hero-price-amount')).toHaveLength(1);
 const sources=container.querySelector('.nl-assumptions-accordion')!;
 expect(sources.hasAttribute('open')).toBe(false);
 await userEvent.setup().click(screen.getByText('Additional charge details'));
 expect(sources.hasAttribute('open')).toBe(true);
 expect(screen.queryByRole('link',{name:/Labour reference/})).toBeNull();
 expect(screen.queryByRole('link',{name:/View supplier price reference/})).toBeNull();
 expect(screen.queryByText(/accessible-film labour planning assumption/)).toBeNull();
 await userEvent.setup().click(aside.getByRole('button',{name:/Use this estimate in your plan/}));
 expect(onAdd).toHaveBeenCalledTimes(1);expect(draft).toEqual(original);
});
it('explains a minimum-charge floor without changing the underlying quantity or price',()=>{
 const draft=fixture();draft.material!.overrides={allowancePercent:'10',minimumLabourCharge:'100',mobilisationCharge:'20'};
 render(<MaterialCostSummary window={draft}/>);
 const aside=within(screen.getByRole('complementary',{name:'Estimated project cost'}));
 expect(aside.getByText('RM 255.75')).toBeTruthy();expect(aside.getByText('RM 100.00')).toBeTruthy();expect(aside.getByText('RM 355.75')).toBeTruthy();
 expect(screen.getByText(/Minimum labour charge: RM 100.00/)).toBeTruthy();
 expect(screen.getAllByText('RM 20.00').length).toBeGreaterThan(0);expect(screen.getByText('Scope including entered charges: RM 375.75')).toBeTruthy();
});
it('does not enable the plan action for stale layouts or claim that pending guideline review passed',()=>{
 const draft=setDimensions(fixture(),{width:'1500',height:'1500',unit:'mm'}),onAdd=vi.fn();
 render(<MaterialCostSummary window={draft} onAddToPlan={onAdd}/>);
 expect((screen.getByRole('button',{name:/Use this estimate in your plan/}) as HTMLButtonElement).disabled).toBe(true);
 expect(screen.getByText(/Generate a current window pattern/)).toBeTruthy();
 expect(screen.queryByText(/validation passed/i)).toBeNull();expect(onAdd).not.toHaveBeenCalled();
});
it('shows missing specialist labour once, keeps it unknown and does not use film artwork for cords',()=>{
 const draft=fixture();draft.material={materialId:'external-cords'};
 const {container}=render(<MaterialCostSummary window={draft}/>);
 expect(screen.getAllByText(/Not included: Specialist installation labour/)).toHaveLength(1);
 expect(screen.getByRole('complementary',{name:'Estimated project cost'}).textContent).not.toContain('RM 0.00');
 expect(container.querySelector('.material-swatch-system')).toBeTruthy();
 expect(container.querySelector('.material-film-sheet')).toBeNull();
});
it('keeps cost errors visible and prevents presenting a subtotal for invalid custom charges',()=>{
 const draft=fixture();draft.material!.overrides={minimumLabourCharge:'invalid'};
 render(<MaterialCostSummary window={draft}/>);
 expect(screen.getByRole('status').textContent).toContain('Enter a valid non-negative minimum labour');
 expect(screen.queryByRole('complementary',{name:'Estimated project cost'})).toBeNull();
});
it('updates installation values from the existing controls and removes unsupported finish claims',async()=>{
 const initial=fixture();let latest=initial;
 function Harness(){const[draft,setDraft]=useState(initial);return <MaterialPlanner window={draft} onChange={next=>{latest=next;setDraft(next);}}/>;}
 render(<Harness/>);
 await userEvent.setup().selectOptions(screen.getByLabelText('Installation method'),'diy');
 expect(within(screen.getByRole('complementary',{name:'Estimated project cost'})).getByText('RM 0.00')).toBeTruthy();
 expect(latest.layout).toBe(initial.layout);
 expect(screen.queryByText(/professional grade|high-performing|Eco-Screening Aligned|Verified Malaysian/)).toBeNull();
 fireEvent.change(screen.getByLabelText('Installation method'),{target:{value:'difficult-access'}});
 expect(screen.getByText('Not included: High-rise / difficult-access charge.')).toBeTruthy();
});
