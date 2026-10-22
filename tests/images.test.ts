import { expect, it } from 'vitest';
import { inspectImageHeader } from '../src/features/member2/images';
it('reads PNG dimensions before raster allocation',()=>{
  const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10],0);bytes.set([73,72,68,82],12);
  const view=new DataView(bytes.buffer);view.setUint32(16,4032);view.setUint32(20,3024);
  expect(inspectImageHeader(bytes)).toEqual({width:4032,height:3024,type:'image/png'});
});
it('reads JPEG dimensions and ignores EXIF payload for the preflight check',()=>{
  const bytes=new Uint8Array([255,216,255,225,0,4,0,0,255,192,0,8,8,3,32,4,0,0]);
  expect(inspectImageHeader(bytes)).toEqual({width:1024,height:800,type:'image/jpeg'});
});
it('rejects unsupported, corrupt and truncated headers',()=>{
  for(const bytes of [new Uint8Array(),new Uint8Array([255,216,255,192,0,8]),new TextEncoder().encode('<svg></svg>')]) expect(()=>inspectImageHeader(bytes)).toThrow();
});
