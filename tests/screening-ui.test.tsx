// @vitest-environment jsdom
import { useState } from 'react';
import { afterEach,expect,it } from 'vitest';
import { cleanup,render,screen,within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriorityAssessment } from '../src/features/screening/PriorityAssessment';
import { createWindow } from '../src/features/member2/model';
import type { WindowDraft } from '../src/features/member2/types';
afterEach(cleanup);
function Harness(){const[draft,setDraft]=useState<WindowDraft>({...createWindow('W-001'),dimensions:{width:'120',height:'150',unit:'cm'}});return <PriorityAssessment window={draft} onChange={setDraft}/>;}
it('collects all factors, explains High alongside unknown follow-up and displays automatic area',async()=>{
  render(<Harness/>);const user=userEvent.setup();
  expect(screen.getByRole('heading',{name:'Needs Review'})).toBeTruthy();
  expect(within(screen.getByRole('group',{name:'Window observations'})).getAllByRole('combobox')).toHaveLength(9);
  await user.selectOptions(screen.getByRole('combobox',{name:/Existing bird-safe treatment/}),'none');
  expect(screen.getByText('1.8 m²',{selector:'output'})).toBeTruthy();
  await user.selectOptions(screen.getByRole('combobox',{name:/Glass reflections/}),'strong');
  await user.selectOptions(screen.getByRole('combobox',{name:/Nearby vegetation/}),'close');
  expect(screen.getByRole('heading',{name:'High'})).toBeTruthy();expect(screen.getByText(/Strong reflections and very close/)).toBeTruthy();
  expect(screen.getByText('Follow-up needed:')).toBeTruthy();
});
it('requires an override reason, retains the recommendation and returns to it on reset',async()=>{
  render(<Harness/>);const user=userEvent.setup();
  await user.click(screen.getByText('Override the recommendation'));
  await user.selectOptions(screen.getByLabelText('Override priority'),'high');await user.click(screen.getByRole('button',{name:'Apply priority override'}));
  expect(screen.getByRole('alert').textContent).toMatch(/reason/);
  await user.type(screen.getByLabelText('Override reason (required)'),'Inspector requests urgent field review.');
  await user.click(screen.getByRole('button',{name:'Apply priority override'}));
  expect(screen.getByRole('heading',{name:'High'})).toBeTruthy();expect(screen.getByText('Rule recommendation: Needs Review.')).toBeTruthy();
  await user.selectOptions(screen.getByRole('combobox',{name:/Nighttime lighting/}),'moderate');
  expect(screen.getByRole('heading',{name:'Medium'})).toBeTruthy();expect(screen.getByText(/saved override no longer matches/)).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Use rule recommendation'}));expect(screen.queryByRole('button',{name:'Use rule recommendation'})).toBeNull();
});

