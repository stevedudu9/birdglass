import { LIMITS } from './model';
import type { ImageAsset } from './types';

/** Read dimensions before decoding to reject oversized raster allocations. */
export function inspectImageHeader(bytes: Uint8Array): { width: number; height: number; type: 'image/jpeg' | 'image/png' } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) {
    if (String.fromCharCode(...bytes.slice(12,16)) !== 'IHDR') throw new Error('Invalid PNG header.');
    return { width: view.getUint32(16), height: view.getUint32(20), type: 'image/png' };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 0xff) throw new Error('Invalid JPEG marker.');
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 8)
        return { height: view.getUint16(offset + 3), width: view.getUint16(offset + 5), type: 'image/jpeg' };
      offset += length;
    }
  }
  throw new Error('Choose a valid JPEG or PNG image.');
}

export async function decodePhoto(file: File): Promise<ImageAsset> {
  if (file.size > LIMITS.fileBytes) throw new Error('Choose an image smaller than 12 MB.');
  if (file.type && !['image/jpeg','image/png'].includes(file.type)) throw new Error('Only JPEG and PNG are supported. Convert HEIC images first.');
  const header = inspectImageHeader(new Uint8Array(await file.arrayBuffer()));
  if (header.width < 1 || header.height < 1 || header.width * header.height > LIMITS.decodedPixels) throw new Error('Choose an image up to 24 megapixels.');
  if (Math.max(header.width,header.height)>LIMITS.imageEdge) throw new Error('Choose an image with a longest edge up to 12,000 pixels.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch { throw new Error('This image could not be decoded. Try another JPEG or PNG.'); }
  try {
    if (![bitmap.width,bitmap.height].every(v=>Number.isSafeInteger(v)&&v>=32)) throw new Error('The image is too small or narrow. Choose a photo with at least 32 pixels on each side.');
    if (bitmap.width*bitmap.height>LIMITS.decodedPixels || Math.max(bitmap.width,bitmap.height)>LIMITS.imageEdge) throw new Error('The decoded image exceeds the supported resolution.');
    function encode(width:number,height:number,type:'image/jpeg'|'image/png',quality?:number):string {
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      try {
        const ctx=canvas.getContext('2d');
        if(!ctx)throw new Error('Image processing is not available in this browser.');
        if(type==='image/jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);}
        ctx.drawImage(bitmap,0,0,width,height);
        const dataUrl=canvas.toDataURL(type,quality);
        if(!/^data:image\/(jpeg|png);base64,/.test(dataUrl))throw new Error('This browser could not retain the full-resolution image. Try a smaller photo.');
        return dataUrl;
      } finally { canvas.width=0;canvas.height=0; }
    }
    // Normalize orientation at the original decoded dimensions; only the overview copy is reduced.
    const dataUrl=encode(bitmap.width,bitmap.height,header.type,header.type==='image/jpeg' ? .96 : undefined);
    const scale=Math.min(1,LIMITS.previewEdge/Math.max(bitmap.width,bitmap.height));
    const preview=scale<1?{
      widthPx:Math.max(1,Math.round(bitmap.width*scale)),heightPx:Math.max(1,Math.round(bitmap.height*scale)),dataUrl:'',
    }:undefined;
    if(preview)preview.dataUrl=encode(preview.widthPx,preview.heightPx,'image/jpeg',.9);
    return { imageId:crypto.randomUUID(),name:file.name,dataUrl,widthPx:bitmap.width,heightPx:bitmap.height,
      orientationNormalized:true,kind:'photo',...(preview?{preview}:{}) };
  } finally { bitmap.close(); }
}

export function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{
    const image=new Image(); image.onload=()=>resolve(image); image.onerror=()=>reject(new Error('Image asset could not be loaded.')); image.src=source;
  });
}
