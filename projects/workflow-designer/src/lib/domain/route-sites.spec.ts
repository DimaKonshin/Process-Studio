import { nearestRouteSite, routeSites } from './route-sites';

describe('route insertion sites', () => {
  const p = (x: number, y: number) => ({ x, y });
  it('provides one midpoint per leg plus its free corners', () => {
    const sites = routeSites([p(80, 0), p(80, 40), p(0, 40), p(0, 60)], []);
    expect(sites.map((s) => s.position)).toEqual([
      p(80, 20),
      p(80, 40),
      p(40, 40),
      p(0, 40),
      p(0, 50),
    ]);
    expect(nearestRouteSite(sites, p(0, 40), 5)).toBe(3);
    expect(nearestRouteSite(sites, p(65, 40), 5)).toBe(2);
  });
  it('splits a simplified leg around existing points and skips an occupied corner', () => {
    const sites = routeSites([p(100, 0), p(0, 0), p(0, 100)], [p(75, 0), p(25, 0), p(0, 0)]);
    expect(sites.map((s) => [s.position, s.insertAt])).toEqual([
      [p(87.5, 0), 0],
      [p(50, 0), 1],
      [p(12.5, 0), 2],
      [p(0, 50), 3],
    ]);
  });
});
