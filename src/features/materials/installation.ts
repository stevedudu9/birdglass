import { DEFAULT_INSTALLATION_METHOD, INSTALLATION_METHODS, INSTALLATION_REFERENCE } from '../../config/installation';
import type { MaterialOption } from '../../config/materialCatalog';
import type { MaterialSelection } from './types';

type Charges={quote:number|null;minimum:number|null;mobilisation:number|null;access:number|null};
/** The reference covers sheet film, not placing individual markers or specialist systems. */
export function installationEstimate(selection:MaterialSelection|undefined, material:MaterialOption|undefined, areaSqft:number, charges:Charges){
  const method=INSTALLATION_METHODS.find(item=>item.id===(selection?.installationMethod??DEFAULT_INSTALLATION_METHOD));
  if(!method)throw new Error('Choose a supported installation method.');
  const compatible=material?.installationBasis==='film-sheet';
  const diy=method.id==='diy';
  const usesQuote=!diy&&selection?.useInstallationQuote!==false&&charges.quote!==null;
  const included=!diy&&material?.installationIncluded===true&&!usesQuote;
  const rate=diy?0:!usesQuote&&!included&&compatible?method.rate:null;
  const rawLabour=diy||included?0:usesQuote?charges.quote:rate===null?null:areaSqft*rate;
  const labourCost=rawLabour===null?null:diy||included?0:Math.max(rawLabour,charges.minimum??0);
  const accessRequired=method.id==='difficult-access';
  // A custom labour quote does not silently cover difficult access.
  const accessCost=accessRequired?charges.access:null;
  const missingComponents:string[]=[];
  if(labourCost===null)missingComponents.push(material?.installationBasis==='individual-markers'?'Individual-marker installation labour':material?'Specialist installation labour':'Installation labour');
  if(accessRequired&&accessCost===null)missingComponents.push('High-rise / difficult-access charge');
  const basis=diy?'DIY — no professional labour':usesQuote?'User-entered labour quotation':included?'Installation included in material reference':rate!==null?'BirdGlass labour planning assumption':'Separate installation quotation required';
  const assumption=diy?'Professional labour is RM0; your own time, tools and any access requirements are excluded.'
    :usesQuote?'The entered quotation replaces the area-based labour assumption. Minimum labour and mobilisation are separate settings.'
    :included?'No additional base labour is added; difficult access is assessed separately.'
    :compatible?`RM${method.rate.toFixed(2)}/sq ft is BirdGlass’s ${method.id==='conservative'?'conservative':'accessible-film'} labour planning assumption within the published RM2.50–RM5.00/sq ft reference range; it is not an installation quotation.`
    :material?.installationBasis==='individual-markers'?'This option is costed as individually applied markers. A film-sheet installation rate is not applied to placing individual dots.'
    :'The film/sticker labour reference does not cover this specialist installation system.';
  return {method:method.id,label:method.label,rate,referenceRate:compatible&&!diy?method.rate:null,
    rawLabour,labourCost,minimumLabourCharge:charges.minimum,mobilisationCharge:charges.mobilisation,
    accessRequired,accessCost,missingComponents,compatible,diy,usesQuote,basis,assumption,
    reference:compatible&&!diy?INSTALLATION_REFERENCE:null};
}
