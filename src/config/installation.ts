export const INSTALLATION_METHODS = [
  {id:'diy',label:'DIY',rate:0,description:'RM0 professional labour'},
  {id:'standard',label:'Standard professional',rate:3.5,description:'RM3.50 / sq ft · accessible film'},
  {id:'conservative',label:'Conservative professional',rate:5,description:'RM5.00 / sq ft · accessible film'},
  {id:'difficult-access',label:'High-rise / difficult access',rate:3.5,description:'Standard film labour + access quotation'},
] as const;
export type InstallationMethodId = typeof INSTALLATION_METHODS[number]['id'];
export const INSTALLATION_REFERENCE = {
  sourceUrl:'https://hgsdisplaysdn.com/products/one-way-vision-sticker-eco-standard-5/',
  sourceTitle:'HGS Display · glass-sticker installation reference',checkedDate:'2026-10-17',
  publishedRange:{min:2.5,max:5,unit:'sq ft'},
  assumption:'RM3.50/sq ft is BirdGlass’s accessible-film labour planning assumption within a published RM2.50–RM5.00/sq ft reference range. It is not an HGS or BirdGlass installation quotation.',
};
export const DEFAULT_INSTALLATION_METHOD:InstallationMethodId='standard';
