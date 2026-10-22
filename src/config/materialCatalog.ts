export type PricingStatus = 'PUBLISHED_MARKET_REFERENCE' | 'CALCULATED_MARKET_AVERAGE' | 'RESEARCH_ASSUMPTION' | 'QUOTE_REQUIRED';
export type MaterialPricingModel = 'PER_SQFT' | 'PER_SQM' | 'PER_PACKAGE' | 'PER_LINEAR_METER' | 'QUOTE_ONLY';
export interface MaterialOption {
  id: string; name: string; description: string; category: 'film' | 'frosted' | 'specialist';
  currency: 'MYR'; pricingModel: MaterialPricingModel; pricingStatus: PricingStatus;
  unitPrice: number | null; supplierReference: string | null; sourceUrl: string | null;
  sourceCheckedDate: string | null; installationIncluded: boolean | null;
  birdSafeProductVerified: boolean; exteriorSuitabilityVerified: boolean;
  patternCompatibility: 'custom-confirmation' | 'different-system';
  installationBasis?: 'film-sheet' | 'individual-markers' | 'specialist';
  minimumArea: number | null; minimumCharge: number | null;
  characteristics: string[]; limitations: string[];
}
export const SQFT_PER_SQM = 10.7639104167;
export const MARKET_DISCLAIMER = 'Prices are indicative estimates based on published market references. Actual costs vary by material specifications, supplier, installation, minimum orders, and site conditions.';
export const ESTIMATE_NOTE = 'This preliminary estimate uses representative published market pricing. It is not a supplier quotation or certification of bird-collision prevention performance.';
export const PRICING_LABELS: Record<PricingStatus,string> = {
  PUBLISHED_MARKET_REFERENCE:'Published market reference', CALCULATED_MARKET_AVERAGE:'Calculated market average',
  RESEARCH_ASSUMPTION:'Research assumption', QUOTE_REQUIRED:'Price unavailable — quotation required',
};
const common = {
  currency:'MYR', installationIncluded:false, birdSafeProductVerified:false, exteriorSuitabilityVerified:false,
  patternCompatibility:'custom-confirmation', minimumArea:null, minimumCharge:null, sourceCheckedDate:'2026-10-17',
} as const;
const bannerLimitations = [
  'Printing reference for a custom treatment concept, not a qualified bird-collision product.',
  'Installation and artwork preparation are excluded. Minimum charges apply but the supplier does not publish a numeric minimum here.',
  'Confirm production of opaque 10 mm white dots at 50 mm centres, exterior suitability and glass compatibility with the supplier.',
];
export const MATERIAL_CATALOG: readonly MaterialOption[] = [
  {...common,id:'standard-dot-film',installationBasis:'film-sheet',name:'Standard Printed-Dot Film',category:'film',
    description:'A custom dot design on standard clear printed film.',
    pricingModel:'PER_SQFT',pricingStatus:'PUBLISHED_MARKET_REFERENCE',unitPrice:9,
    supplierReference:'Banner3 • normal clear film, white printing',sourceUrl:'https://www.banner3.com/ampang-frosted-glass-sticker',
    characteristics:['Standard clear film','Custom printed pattern'],limitations:bannerLimitations},
  {...common,id:'premium-clear-film',installationBasis:'film-sheet',name:'Premium Ultra-Clear Printed-Dot Film',category:'film',
    description:'An ultra-clear film concept with a custom printed dot pattern.',
    pricingModel:'PER_SQFT',pricingStatus:'PUBLISHED_MARKET_REFERENCE',unitPrice:12,
    supplierReference:'Banner3 • ultra-clear film, white printing reference',sourceUrl:'https://www.banner3.com/ampang-frosted-glass-sticker',
    characteristics:['Ultra-clear film reference','Custom printed pattern'],limitations:bannerLimitations},
  {...common,id:'die-cut-frosted',installationBasis:'individual-markers',name:'Die-Cut Frosted Pattern Sticker',category:'frosted',
    description:'A cut-out frosted finish for a custom repeating pattern.',
    pricingModel:'PER_SQFT',pricingStatus:'PUBLISHED_MARKET_REFERENCE',unitPrice:7,
    supplierReference:'e-banner Malaysia • plain frosted sticker, die-cut',sourceUrl:'https://my.e-banner.com/frosted-sticker/',
    characteristics:['Frosted finish','Die-cut pattern reference'],limitations:[
      'RM7 per sq ft is the plain frosted die-cut reference. The supplier lists white-print UV-W die-cut at RM10 per sq ft; that upgrade is not included.',
      'Frosted markers differ from the opaque white dots in the preview. Contrast, 10 mm cuts and exterior installation need supplier confirmation.',
      'Installation, artwork, delivery and supplier minimum charges are not established by this reference.',
    ]},
  {...common,id:'specialist-markers',name:'Specialist bird markers',category:'specialist',description:'A purpose-designed marker system. Confirm product specifications and coverage with a supplier.',
    pricingModel:'QUOTE_ONLY',pricingStatus:'QUOTE_REQUIRED',unitPrice:null,supplierReference:null,sourceUrl:null,sourceCheckedDate:null,
    characteristics:['Supplier-defined coverage'],limitations:['No comparable Malaysian market price has been verified. Do not substitute an area rate for a coverage pack.']},
  {...common,id:'external-cords',name:'External cord curtains',category:'specialist',description:'A separate cord and hardware system requiring a site-specific design.',
    pricingModel:'QUOTE_ONLY',pricingStatus:'QUOTE_REQUIRED',unitPrice:null,supplierReference:null,sourceUrl:null,sourceCheckedDate:null,
    patternCompatibility:'different-system',characteristics:['Cords and hardware'],limitations:['The current dot preview does not represent a cord curtain. A separate design and quotation are required.']},
  {...common,id:'architectural-glazing',name:'Replacement architectural glazing',category:'specialist',description:'Custom glazing specified and priced for the building project.',
    pricingModel:'QUOTE_ONLY',pricingStatus:'QUOTE_REQUIRED',unitPrice:null,supplierReference:null,sourceUrl:null,sourceCheckedDate:null,
    patternCompatibility:'different-system',characteristics:['Custom fabrication'],limitations:['The dot overlay is not a specification for replacement glazing. Product and structural review are required.']},
];
export const findMaterial = (id: string | undefined) => MATERIAL_CATALOG.find(item => item.id === id);
