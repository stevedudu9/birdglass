/** Project engineering convention, NOT a threshold specified by an external standard. */
export const BOUNDARY_POLICY = {
  id: 'BG-EDGE-001',
  version: '1.0.0',
  maxClearGapMm: 25,
  definition: 'glass-edge-to-dot-edge',
  provenance: 'BirdGlass engineering policy derived from the centred maximal fixed-pitch grid',
  basis: 'For pitch p = 50 mm, the leftover length after fitting full dots is less than p. Centring splits it into two clear margins, each less than 25 mm.',
  note: 'The 25 mm ceiling is not an independently tested ecological threshold, certification or installation tolerance.',
} as const;
