import type { GuidelineProfile } from '../features/member2/types';
import { BOUNDARY_POLICY } from './boundaryPolicy';

export const BASELINE_GUIDELINE: GuidelineProfile = {
  id:'birdglass-white-10-50', version:'2026-10-15.2', name:'White dot baseline with BirdGlass edge policy', status:'draft',
  dotDiameterMm:10, markerColor:'white', targetCenterPitchXmm:50, targetCenterPitchYmm:50,
  fixedCenterPitch:true, maxCenterPitchXmm:50, maxCenterPitchYmm:50, maxClearGapXmm:40, maxClearGapYmm:40,
  // BG-EDGE-001 is a derived project rule, not a quoted research/CSA threshold.
  maxBoundaryClearGapMm:BOUNDARY_POLICY.maxClearGapMm,
  boundaryDefinition:BOUNDARY_POLICY.definition, coverageRule:'full-rectangular-grid',
  installationConditions:[
    'Apply high-contrast white circular markers to the exterior (first) surface of the glass.',
    'Apply a continuous pattern across each selected glass pane.',
    'Prioritize the first 16 m above ground, or mature tree canopy height if greater.',
    'Review glass corners, balcony railings, glazing near vegetation and rooftop gardens.',
    'Confirm material suitability, visibility, access and installation conditions on site.',
    'Boundary check: BG-EDGE-001 limits glass-edge-to-dot-edge clearance to 25 mm on each side. This is a BirdGlass engineering convention, not an externally validated ecological threshold.',
  ],
  sources:[
    {title:'De Groot et al. (2022), PeerJ 10:e13142',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8953498/',checkedOn:'2026-10-15',locator:'Methods: Study sites; Discussion; Figure 2'},
    {title:'Toronto Green Standard V4 — Ecology & Biodiversity',url:'https://www.toronto.ca/city-government/planning-development/official-plan-guidelines/toronto-green-standard/toronto-green-standard-version-4/mid-to-high-rise-residential-non-residential-version-4/ecology-biodiversity/',checkedOn:'2026-10-15',locator:'EC 5.1, EC 5.2 and specifications'},
    {title:'FLAP Canada — Bird-building collision FAQ',url:'https://www.flap.org/faq',checkedOn:'2026-10-15',locator:'Window treatment and bird-safe glass guidance'},
    {title:'NYC Bird Alliance — Bird-friendly windows',url:'https://nycbirdalliance.org/take-action/make-nyc-bird-friendly/make-your-windows-bird-friendly',checkedOn:'2026-10-15',locator:'Exterior patterns and high-contrast markers'},
  ],
};

