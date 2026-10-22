// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreatmentActions } from '../src/demo/TreatmentActions';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { createWindow, buildLayoutRequest } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
afterEach(cleanup);
function fixture():WindowDraft{
 const draft:WindowDraft={...createWindow('Lobby'),dimensions:{width:'1200',height:'1500',unit:'mm'},image:{imageId:'fixture',name:'window.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'photo'},corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
 draft.layout=generatePattern(buildLayoutRequest(draft,BASELINE_GUIDELINE),BASELINE_GUIDELINE);return draft;
}
it('keeps add, report, placement and compare actions working with the current treatment',async()=>{
 const draft=fixture(),onAdd=vi.fn(),onExport=vi.fn(),onPlacement=vi.fn(),user=userEvent.setup();
 const props={window:draft,inPlan:false,onAdd,onExport,onPlacement};const {rerender}=render(<TreatmentActions {...props}/>);
 await user.click(screen.getByRole('button',{name:/Add to building plan/}));expect(onAdd).toHaveBeenCalledTimes(1);
 await user.click(screen.getByRole('button',{name:/Download treatment summary/}));
 await user.click(screen.getByRole('button',{name:/Download placement sheet/}));
 for(const callback of [onExport,onPlacement])expect(callback.mock.calls[0][0]).toMatchObject({draft:{windowId:draft.windowId},quantities:{dotCount:720},check:{status:'incomplete'}});
 expect(screen.getByRole('link',{name:/Compare windows/}).getAttribute('href')).toBe('#building-plan');
 rerender(<TreatmentActions {...props} inPlan exporting/>);
 expect(screen.getByRole('button',{name:/Update building plan/})).toBeTruthy();
 expect((screen.getByRole('button',{name:'Preparing summary…'}) as HTMLButtonElement).disabled).toBe(true);
});
it('keeps export controls unavailable for missing or invalid layouts',()=>{
 const draft=fixture(),props={window:draft,inPlan:false,onAdd:vi.fn(),onExport:vi.fn(),onPlacement:vi.fn()};draft.layout=null;
 const {rerender}=render(<TreatmentActions {...props}/>);expect(screen.queryByRole('region',{name:'Treatment actions'})).toBeNull();
 const invalid=fixture();invalid.layout!.dotsMm[0].xMm=-10;rerender(<TreatmentActions {...props} window={invalid}/>);
 expect(screen.queryByRole('button')).toBeNull();
});
