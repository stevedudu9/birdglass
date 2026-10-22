// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BASELINE_GUIDELINE } from '../src/config/baseline';
import { buildLayoutRequest, createWindow } from '../src/features/member2/model';
import type { GuidelineProfile, LayoutResult, WindowDraft } from '../src/features/member2/types';
import { generatePattern } from '../src/features/member3';
import { treatmentSummary } from '../src/demo/treatmentSummary';
import { PatternValidationStatus } from '../src/demo/PatternValidationStatus';
import { Member3Results } from '../src/demo/Member3Results';
import { buildTreatmentReport } from '../src/demo/treatmentReport';
import { emptyPlan, treatmentFor } from '../src/demo/planning';

afterEach(cleanup);
function fixture(guideline:GuidelineProfile=BASELINE_GUIDELINE):WindowDraft {
 const draft:WindowDraft={...createWindow('Validation pane'),dimensions:{width:'1200',height:'1500',unit:'mm'},
 image:{imageId:'fixture',name:'window.png',dataUrl:'data:image/png;base64,AAAA',widthPx:1000,heightPx:800,orientationNormalized:true,kind:'photo'},
 corners:{tl:{u:.1,v:.1},tr:{u:.9,v:.1},br:{u:.9,v:.9},bl:{u:.1,v:.9}}};
 draft.layout=generatePattern(buildLayoutRequest(draft,guideline),guideline);return draft;
}
function status(draft:WindowDraft,guideline:GuidelineProfile=BASELINE_GUIDELINE){
 const summary=treatmentSummary(draft,guideline);
 return {summary, ...render(<PatternValidationStatus summary={summary} layout={draft.layout} guideline={guideline}/>)};
}
it('shows geometry success and one team-review label while preserving incomplete metadata and report status',()=>{
 const draft=fixture(),before=structuredClone(draft),profileBefore=structuredClone(BASELINE_GUIDELINE);
 const {summary,container}=status(draft);
 expect(summary.status).toBe('incomplete');expect(draft.layout!.validation.status).toBe('incomplete');
 expect(screen.getByText('Pattern geometry checks passed')).toBeTruthy();
 expect(screen.getAllByText('Guideline reference: Team review pending')).toHaveLength(1);
 expect(container.querySelector('.pattern-status-geometry-pass')).toBeTruthy();
 expect(container.querySelectorAll('li')).toHaveLength(0);
 expect(screen.queryByText(/Pattern validation incomplete/)).toBeNull();
 const html=buildTreatmentReport([treatmentFor(draft)],emptyPlan());
 expect(html).toContain('Pattern validation incomplete.');expect(html).toContain('does not certify collision prevention');
 expect(draft).toEqual(before);expect(BASELINE_GUIDELINE).toEqual(profileBefore);expect(BASELINE_GUIDELINE.status).toBe('draft');
});
it('reflects a reviewed profile through normal configured validation without an automatic profile change',()=>{
 const guideline:GuidelineProfile={...structuredClone(BASELINE_GUIDELINE),status:'reviewed',version:'reviewed-test'};
 const {summary}=status(fixture(guideline),guideline);
 expect(summary.status).toBe('pass');expect(screen.getByText('Pattern geometry checks passed')).toBeTruthy();
 expect(screen.getByText('Guideline reference: Reviewed')).toBeTruthy();
 expect(screen.queryByText(/Team review pending/)).toBeNull();expect(BASELINE_GUIDELINE.status).toBe('draft');
});
it('retains specific geometry failures in a visible alert in the actual results section',()=>{
 const draft=fixture();draft.layout!.dotsMm[0].xMm=-10;
 render(<Member3Results window={draft} changed={false}/>);
 expect(screen.getByRole('alert').textContent).toContain('Pattern geometry checks failed');
 expect(screen.getByRole('alert').textContent).toContain('A complete dot extends outside the glass.');
 expect(screen.queryByText('Pattern geometry checks passed')).toBeNull();
});
it('does not claim success before a layout exists',()=>{
 const draft=fixture();draft.layout=null;
 const {summary}=status(draft);
 expect(summary.status).toBe('unknown');expect(screen.getByText('Pattern geometry not checked')).toBeTruthy();
 expect(screen.queryByText('Pattern geometry checks passed')).toBeNull();
});
it('keeps unavailable geometry results incomplete and displays the reason',()=>{
 const draft=fixture();draft.corners={};
 const {summary}=status(draft);
 expect(summary.status).toBe('incomplete');expect(screen.getByText('Pattern checks incomplete')).toBeTruthy();
 expect(screen.getByRole('status').querySelectorAll('li').length).toBeGreaterThan(0);
 expect(screen.queryByText('Pattern geometry checks passed')).toBeNull();
});
it('preserves a genuinely separate unresolved provider check',()=>{
 const draft=fixture();draft.layout!.validation.issues.push('Provider coverage check unavailable.');
 const {summary}=status(draft);
 expect(summary.status).toBe('incomplete');expect(screen.getByText('Provider coverage check unavailable.')).toBeTruthy();
 expect(screen.getByText('Pattern checks incomplete')).toBeTruthy();
 expect(screen.queryByText('Pattern geometry checks passed')).toBeNull();
});
it('does not suppress an unexplained incomplete provider result',()=>{
 const draft=fixture();draft.layout!.validation={status:'incomplete',issues:[]};status(draft);
 expect(screen.getByText('The algorithm reports incomplete checks.')).toBeTruthy();
 expect(screen.queryByText('Pattern geometry checks passed')).toBeNull();
});
it('preserves unsupported boundary checks instead of folding them into guideline review',()=>{
 const guideline={...structuredClone(BASELINE_GUIDELINE),boundaryDefinition:'not-implemented'};
 const {summary}=status(fixture(guideline),guideline);
 expect(summary.treatment).not.toBeNull();expect(screen.getByText('The supplied boundary definition is not supported.')).toBeTruthy();
 expect(screen.queryByText('Pattern geometry checks passed')).toBeNull();
});
it('handles malformed validation metadata without crashing the results UI',()=>{
 const draft=fixture();delete (draft.layout as Partial<LayoutResult>).validation;
 const {summary}=status(draft);
 expect(summary.status).toBe('fail');expect(screen.getByRole('alert')).toBeTruthy();
 expect(screen.queryByText('Pattern geometry checks passed')).toBeNull();
});
