import { describe, expect, it } from 'vitest';
import { makeHomography, pointerToNorm, projectDots, transformPoint, validateCorners } from '../src/features/member2/geometry';
import type { CornersNorm } from '../src/features/member2/types';

const rectangle: CornersNorm = { tl: { u: .1, v: .1 }, tr: { u: .9, v: .1 }, br: { u: .9, v: .9 }, bl: { u: .1, v: .9 } };
describe('perspective geometry', () => {
  it('maps an independent interior point in an affine rectangle', () => {
    const p = transformPoint(makeHomography(rectangle), .25, .75);
    expect(p.u).toBeCloseTo(.3, 10); expect(p.v).toBeCloseTo(.7, 10);
  });
  it('recovers a known perspective transform at points not used in the fit', () => {
    // Analytic reference independent of the implementation being tested.
    const reference = (x: number, y: number) => ({ u: (.6 * x + .1 * y + .15) / (.2 * x + .3 * y + 1), v: (.05 * x + .7 * y + .1) / (.2 * x + .3 * y + 1) });
    const h = makeHomography({ tl: reference(0, 0), tr: reference(1, 0), br: reference(1, 1), bl: reference(0, 1) });
    for (const [x, y] of [[.5, .5], [.12, .72], [.9, .2]]) {
      const actual = transformPoint(h, x, y), expected = reference(x, y);
      expect(actual.u).toBeCloseTo(expected.u, 10); expect(actual.v).toBeCloseTo(expected.v, 10);
    }
  });
  it.each([
    { ...rectangle, tr: rectangle.tl },
    { ...rectangle, tr: rectangle.bl, bl: rectangle.tr },
    { ...rectangle, tl: { u: NaN, v: .2 } },
    { ...rectangle, tl: { u: -.1, v: .2 } },
    { tl: { u: .1, v: .1 }, tr: { u: .2, v: .1 }, br: { u: .3, v: .100001 }, bl: { u: .4, v: .100001 } },
  ])('rejects invalid quadrilaterals', corners => expect(validateCorners(corners).length).toBeGreaterThan(0));
  it('keeps explicit corner identities for a rotated glass plane', () => {
    const corners = { tl: {u:.5,v:.1}, tr: {u:.9,v:.5}, br: {u:.5,v:.9}, bl: {u:.1,v:.5} };
    expect(validateCorners(corners)).toEqual([]);
    expect(transformPoint(makeHomography(corners), .5, .5).u).toBeCloseTo(.5);
  });
  it('projects the entire physical dot, including perspective size change', () => {
    const corners = { tl: {u:.1,v:.1}, tr: {u:.9,v:.1}, br: {u:.7,v:.9}, bl: {u:.3,v:.9} };
    const dots = projectDots([{id:'a',xMm:500,yMm:100},{id:'b',xMm:500,yMm:900}], 10, 1000, 1000, corners);
    const width = (i: number) => Math.max(...dots[i].outlineNorm.map(p=>p.u)) - Math.min(...dots[i].outlineNorm.map(p=>p.u));
    expect(width(0)).toBeGreaterThan(width(1)); expect(dots[0].outlineNorm).toHaveLength(48);
  });
  it('handles contain padding and rejects clicks in the letterbox', () => {
    const bounds = { left: 20, top: 30, width: 800, height: 800 };
    expect(pointerToNorm(420, 430, bounds, 1600, 800)).toEqual({u:.5,v:.5});
    expect(pointerToNorm(420, 40, bounds, 1600, 800)).toBeNull();
    expect(pointerToNorm(220, 230, {left:20,top:30,width:400,height:400},1600,800)).toEqual({u:.5,v:.5});
  });
});
