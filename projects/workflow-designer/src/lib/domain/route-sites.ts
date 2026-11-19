import type { RouteVertex, WorkflowPosition as Point } from './workflow-graph';

export interface RouteSite {
  readonly kind: 'horizontal' | 'vertical' | 'corner';
  readonly from: Point;
  readonly to: Point;
  readonly position: Point;
  readonly insertAt: number;
}

const tolerance = 0.01; // The final SVG endpoint can be offset by a fraction of a pixel.
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

export function captureRoute(
  vertices: readonly Point[],
  controls: readonly Point[],
): RouteVertex[] {
  if (vertices.length < 2) return [];
  const route: RouteVertex[] = [{ ...vertices[0] }];
  let next = 0;
  for (let i = 1; i < vertices.length; i++) {
    let from = vertices[i - 1];
    const to = vertices[i];
    while (next < controls.length && distanceToSegment(controls[next], from, to) <= tolerance) {
      from = controls[next++];
      route.push({ x: from.x, y: from.y, control: true });
    }
    if (i === vertices.length - 1 || distance(route[route.length - 1], to) > tolerance)
      route.push({ ...to });
  }
  return route;
}

/** Put a surviving segment handle back on a port-to-port route before applying its drag offset. */
export function singleSegmentFrame(
  barePath: readonly Point[],
  previous: readonly RouteVertex[],
  controlIndex: number,
  handle: Point,
): RouteVertex[] | undefined {
  const control = previous.filter((vertex) => vertex.control)[controlIndex];
  const i = previous.indexOf(control);
  if (i < 1 || i >= previous.length - 1) return;
  const before = previous[i - 1];
  const after = previous[i + 1];
  const alongX =
    Math.abs(before.y - control.y) <= tolerance && Math.abs(after.y - control.y) <= tolerance;
  const alongY =
    Math.abs(before.x - control.x) <= tolerance && Math.abs(after.x - control.x) <= tolerance;
  if (alongX === alongY) return; // A corner can be dragged along both axes.
  const axis = alongX ? 'x' : 'y';
  const cross = alongX ? 'y' : 'x';
  let projection: Point | undefined;
  let bestDistance = Infinity;
  for (let j = 1; j < barePath.length; j++) {
    const a = barePath[j - 1];
    const b = barePath[j];
    if (Math.abs(a[cross] - b[cross]) > tolerance) continue;
    if (
      handle[axis] <= Math.min(a[axis], b[axis]) + tolerance ||
      handle[axis] >= Math.max(a[axis], b[axis]) - tolerance
    )
      continue;
    const offset = Math.abs(a[cross] - handle[cross]);
    if (offset < bestDistance) {
      bestDistance = offset;
      projection = { ...handle, [cross]: a[cross] };
    }
  }
  return projection ? captureRoute(barePath, [projection]) : undefined;
}

// Foblex simplifies collinear vertices. Split each visible leg at the saved waypoints
// in traversal order so inserting on a return path also preserves waypoint order.
export function routeSites(vertices: readonly Point[], waypoints: readonly Point[]): RouteSite[] {
  const sites: RouteSite[] = [];
  let insertAt = 0;
  function addLeg(from: Point, to: Point): void {
    if (distance(from, to) <= tolerance) return;
    const position = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
    const kind = Math.abs(from.x - to.x) > Math.abs(from.y - to.y) ? 'horizontal' : 'vertical';
    sites.push({ kind, from, to, position, insertAt });
  }
  for (let i = 1; i < vertices.length; i++) {
    let from = vertices[i - 1];
    const to = vertices[i];
    while (
      insertAt < waypoints.length &&
      distanceToSegment(waypoints[insertAt], from, to) <= tolerance
    ) {
      const waypoint = waypoints[insertAt];
      addLeg(from, waypoint);
      from = waypoint;
      insertAt++;
    }
    addLeg(from, to);
    if (i < vertices.length - 1 && distance(from, to) > tolerance) {
      sites.push({ kind: 'corner', from: to, to, position: to, insertAt });
    }
  }
  return sites;
}

export function nearestRouteSite(
  sites: readonly RouteSite[],
  point: Point,
  snapDistance: number,
): number {
  // Close to a corner, choose the closest marker. Elsewhere, pick the leg under the pointer.
  let nearest = -1;
  let best = Infinity;
  for (const [i, site] of sites.entries()) {
    const markerDistance = distance(site.position, point);
    const score =
      markerDistance <= snapDistance
        ? markerDistance
        : snapDistance + distanceToSegment(point, site.from, site.to);
    if (score < best) {
      nearest = i;
      best = score;
    }
  }
  return nearest;
}
