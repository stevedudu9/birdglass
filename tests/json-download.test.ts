import { afterEach, expect, it, vi } from 'vitest';
import { downloadJson } from '../src/features/member2/export';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});

it('downloads compact JSON without changing numbers, strings or nested data',async()=>{
  vi.useFakeTimers();
  let captured:Blob|null=null;
  vi.spyOn(URL,'createObjectURL').mockImplementation(blob=>{captured=blob as Blob;return 'blob:test';});
  vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  const anchor={href:'',download:'',click:vi.fn()};
  vi.stubGlobal('document',{createElement:()=>anchor});
  const data={label:'Garden-facing 窗\nName',points:[{u:.12345678901234567,v:.9876543210987654}],pending:null};
  downloadJson(data,'example.json');
  expect(anchor.download).toBe('example.json');
  expect(anchor.click).toHaveBeenCalledOnce();
  const text=await captured!.text();
  expect(JSON.parse(text)).toEqual(data);
  expect(text.length).toBeLessThan(JSON.stringify(data,null,2).length);
  expect(captured!.type).toBe('application/json');
});
