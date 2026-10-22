// Draws every dot from its coordinates as one SVG path.
export function physicalDotPath(dots: { xMm: number; yMm: number }[], radiusMm: number, scale: number, x: number, y: number) {
  const r = Math.max(radiusMm * scale, 0.35);
  return dots.map(dot => {
    const cx = x + dot.xMm * scale, cy = y + dot.yMm * scale;
    return `M${(cx - r).toFixed(2)} ${cy.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;
  }).join('');
}
