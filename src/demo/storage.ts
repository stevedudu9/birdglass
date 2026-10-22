import { isMaterialSelection } from '../features/materials/types';
import { LIMITS } from '../features/member2/model';
import { parseLayout } from '../features/member2/validation';
import type { WindowDraft } from '../features/member2/types';
import { isBuildingPlan } from './planning';
import { isScreeningRecord } from '../features/screening/assessment';
import type { BuildingPlan } from './planning';
export type SavedProject={version:1;windows:WindowDraft[];activeId:string;buildingPlan?:BuildingPlan};
function openDatabase():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open('birdglass-member2',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('project');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
}
export function isStoredWindowDraft(value:unknown):value is WindowDraft{
  if(!value||typeof value!=='object')return false;
  const v=value as WindowDraft;
  if(typeof v.windowId!=='string'||typeof v.buildingId!=='string'||typeof v.label!=='string'||!v.corners||typeof v.corners!=='object')return false;
  if(!v.dimensions||typeof v.dimensions.width!=='string'||typeof v.dimensions.height!=='string'||!['mm','cm','m'].includes(v.dimensions.unit))return false;
  if(!Number.isSafeInteger(v.dimensionRevision)||v.dimensionRevision<0||!Number.isSafeInteger(v.photoRevision)||v.photoRevision<0)return false;
  if(v.material!==undefined&&!isMaterialSelection(v.material))return false;
  if(v.shape!==undefined&&(!v.shape||typeof v.shape!=='object'||!['rectangle','arch','raked','custom'].includes(v.shape.kind)
    ||(['rise','shortHeight'] as const).some(key=>v.shape![key]!==undefined&&(typeof v.shape![key]!=='string'||v.shape![key]!.length>20))
    ||(v.shape.points!==undefined&&(typeof v.shape.points!=='string'||v.shape.points.length>20_000))
    ||(v.shape.shortSide!==undefined&&!['left','right'].includes(v.shape.shortSide))))return false;
  if(v.screening!==undefined&&!isScreeningRecord(v.screening))return false;
  if(Object.values(v.corners).some(p=>!p||!Number.isFinite(p.u)||!Number.isFinite(p.v)))return false;
  if(v.image&&(!/^data:image\/(png|jpeg);base64,/.test(v.image.dataUrl)||typeof v.image.imageId!=='string'||!v.image.orientationNormalized||!Number.isSafeInteger(v.image.widthPx)||!Number.isSafeInteger(v.image.heightPx)||v.image.widthPx<1||v.image.heightPx<1||v.image.widthPx>LIMITS.imageEdge||v.image.heightPx>LIMITS.imageEdge))return false;
  if(v.image&&v.image.widthPx*v.image.heightPx>LIMITS.decodedPixels)return false;
  if(v.image&&v.image.preview!==undefined){
    const p=v.image.preview;
    if(!p||typeof p!=='object'||!/^data:image\/(png|jpeg);base64,/.test(p.dataUrl)||![p.widthPx,p.heightPx].every(n=>Number.isSafeInteger(n)&&n>=1&&n<=LIMITS.previewEdge))return false;
    if(p.widthPx>v.image.widthPx||p.heightPx>v.image.heightPx)return false;
  }
  if(v.layout){try{parseLayout(v.layout);}catch{return false;}}
  return true;
}
export async function loadProject():Promise<SavedProject|null>{
  const db=await openDatabase();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('project','readonly'),request=tx.objectStore('project').get('current');
    request.onsuccess=()=>{
      const value=request.result;if(!value){resolve(null);return;}
      if(value.version!==1||!Array.isArray(value.windows)||value.windows.length<1||value.windows.length>LIMITS.windows||!value.windows.every(isStoredWindowDraft)||new Set(value.windows.map((w:WindowDraft)=>w.windowId)).size!==value.windows.length){reject(new Error('Saved project format is invalid. Autosave is paused to preserve it.'));return;}
      if(value.buildingPlan!==undefined&&!isBuildingPlan(value.buildingPlan)){reject(new Error('Saved building plan format is invalid. Autosave is paused to preserve it.'));return;}
      resolve(value as SavedProject);
    };
    request.onerror=()=>reject(request.error);tx.oncomplete=()=>db.close();tx.onerror=()=>db.close();
  });
}
let saveQueue:Promise<void>=Promise.resolve();
export function saveProject(project:SavedProject):Promise<void>{
  saveQueue=saveQueue.catch(()=>{}).then(async()=>{
    const db=await openDatabase();
    await new Promise<void>((resolve,reject)=>{
      const tx=db.transaction('project','readwrite');tx.objectStore('project').put(project,'current');
      tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};tx.onabort=()=>{db.close();reject(tx.error);};
    });
  });
  return saveQueue;
}
