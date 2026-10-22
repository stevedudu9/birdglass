/** Published sources identify hazards; the tier combinations below are BirdGlass
 * project policy, not published/validated cutoffs or a probability model. */
export const SCREENING_SOURCES = [
  { id:'fws', title:'USFWS Bird-Friendly Building Toolkit', url:'https://www.fws.gov/library/collections/bird-friendly-building-toolkit', scope:'Past collisions, reflections, lighting, feeders and water sources.' },
  { id:'nparks', title:'NParks biodiversity and bird-safe building guidance', url:'https://www.nparks.gov.sg/nature/enhancing-biodiversity-guidelines-resources', scope:'Reflections, transparency, lighting and collision monitoring; regional context.' },
  { id:'abc', title:'ABC Bird-friendly Legislation & Code', url:'https://abcbirds.org/strategies/bird-friendly-legislation-code/', scope:'Glazing, auxiliary structures and why small panes should not be exempted.' },
  { id:'toronto', title:'Toronto Bird-Friendly Guidelines', url:'https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/design-guidelines/bird-friendly-guidelines/', scope:'Use its linked Best Practices for Glass (2016), pp. 18–20, 24 and 39–43, for reflections, vegetation, fly-through, canopy and architectural hazards. Historical context, not current Malaysian law.' },
] as const;

export const FACTORS = {
  collisions: { label:'Documented past collisions', options:[['unknown','Unknown'],['yes','Yes'],['none','None reported']] },
  reflections: { label:'Glass reflections', options:[['unknown','Unknown'],['strong','Strong'],['some','Some'],['minimal','Minimal']] },
  transparency: { label:'Transparency or apparent fly-through', options:[['unknown','Unknown'],['yes','Yes'],['no','No']] },
  vegetation: { label:'Nearby vegetation', options:[['unknown','Unknown'],['close','Very close'],['some','Some'],['none','None observed']] },
  canopy: { label:'Height relative to surrounding tree canopy', options:[['unknown','Unknown'],['within','Within / at or below canopy'],['above','Above']] },
  architecture: { label:'Architectural hazard', options:[['unknown','Unknown'],['corner','Glass corner'],['parallel','Parallel glazing'],['railing','Glass railing'],['standard','Standard'],['other','Other']] },
  attractants: { label:'Nearby bird attractants', options:[['unknown','Unknown'],['yes','Yes'],['no','No']] },
  lighting: { label:'Nighttime lighting', options:[['unknown','Unknown'],['high','High'],['moderate','Moderate'],['low','Low']] },
  treatment: { label:'Existing bird-safe treatment', options:[['unknown','Unknown / not assessed'],['none','None'],['unverified','Present but unverified'],['verified','Suitable treatment verified']] },
} as const;
export type Factor = keyof typeof FACTORS;
export type Inputs = { [K in Factor]: typeof FACTORS[K]['options'][number][0] };
export type Priority = 'high' | 'medium' | 'lower' | 'review';
export const PRIORITY_LABELS:Record<Priority,string> = {high:'High',medium:'Medium',lower:'Lower',review:'Needs Review'};
export type Rule = {id:string;level:'high'|'medium';when:Partial<Record<Factor,readonly string[]>>;reason:string;sources:readonly string[]};
export type ScreeningConfig = {id:string;version:string;rules:readonly Rule[];largeUntreatedAreaM2:number|null};
export const SCREENING_CONFIG:ScreeningConfig = {
  id:'BG-SCREEN', version:'1.0.1',
  // No evidence-based single-pane area threshold has been agreed. Area is
  // reported, never used as an exemption. A future reviewed policy can set one.
  largeUntreatedAreaM2:null,
  rules:[
    {id:'H-REFLECT-VEG',level:'high',when:{reflections:['strong'],vegetation:['close']},reason:'Strong reflections and very close vegetation occur together.',sources:['fws','nparks','toronto']},
    {id:'H-FLY-ARCH',level:'high',when:{transparency:['yes'],architecture:['corner','parallel','railing']},reason:'An apparent fly-through occurs at a glass corner, parallel glazing or railing.',sources:['toronto','abc']},
    {id:'H-ATTRACT-GLASS',level:'high',when:{attractants:['yes'],reflections:['strong'],canopy:['within']},reason:'Strong reflections, bird attractants and glass within canopy height occur together.',sources:['fws','toronto']},
    {id:'M-REFLECT',level:'medium',when:{reflections:['some','strong']},reason:'Some or strong reflections may resemble habitat or open sky.',sources:['fws','nparks','toronto']},
    {id:'M-FLY',level:'medium',when:{transparency:['yes']},reason:'The glass appears to offer a transparent passage.',sources:['nparks','toronto']},
    {id:'M-VEG',level:'medium',when:{vegetation:['close','some']},reason:'Vegetation is present near the glass.',sources:['toronto']},
    {id:'M-ARCH',level:'medium',when:{architecture:['corner','parallel','railing']},reason:'A glass corner, parallel glazing or railing requires attention.',sources:['toronto','abc']},
    {id:'M-ATTRACT',level:'medium',when:{attractants:['yes']},reason:'Nearby bird attractants can bring birds close to glass.',sources:['fws']},
    {id:'M-LIGHT',level:'medium',when:{lighting:['high','moderate']},reason:'Moderate or high nighttime lighting warrants a lighting review.',sources:['fws','nparks']},
    {id:'M-CANOPY',level:'medium',when:{canopy:['within'],vegetation:['some','close']},reason:'Glass is within surrounding canopy height near vegetation.',sources:['toronto']},
  ],
};
