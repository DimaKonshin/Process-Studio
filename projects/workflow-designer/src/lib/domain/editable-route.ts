import type { RouteVertex, WorkflowPosition as Point } from './workflow-graph';

function horizontal(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) >= Math.abs(a.y - b.y);
}

/** Keep mid-segment handles on their perpendicular drag axis. A corner has two degrees of freedom. */
export function constrainHandles(
  route: readonly RouteVertex[],
  requested: readonly Point[],
  source: Point,
  target: Point,
): Point[] {
  const handles: Point[] = [];
  for (let i = 1; i < route.length - 1; i++) {
    const v = route[i];
    if (!v.control) continue;
    const p = requested[handles.length] ?? v;
    const incoming = horizontal(route[i - 1], v);
    const outgoing = horizontal(v, route[i + 1]);
    let x = incoming && outgoing ? v.x : p.x;
    const y = !incoming && !outgoing ? v.y : p.y;
    // Protect the outward lead at either port when translating its adjacent vertical leg.
    if (i === 1 || (i === 2 && !route[1].control && !incoming))
      x = Math.max(x, source.x + Math.min(8, Math.max(0, route[1].x - route[0].x)));
    const last = route.length - 1;
    if (i === last - 1 || (i === last - 2 && !route[last - 1].control && !outgoing))
      x = Math.min(x, target.x - Math.min(8, Math.max(0, route[last].x - route[last - 1].x)));
    handles.push({ x, y });
  }
  return handles;
}

/** Move the two neighbouring bends. Everywhere else the saved topology stays fixed. */
export function editablePolyline(
  route: readonly RouteVertex[],
  handles: readonly Point[],
  source: Point,
  target: Point,
): Point[] {
  let next = 0;
  const last = route.length - 1;
  const anchors = route.map((v, i) =>
    i === 0 ? source : i === last ? target : v.control ? handles[next++] : { x: v.x, y: v.y },
  );
  for (let i = 1; i < last; i++) {
    if (route[i].control) continue;
    const bend = { ...anchors[i] };
    for (const j of [i - 1, i + 1]) {
      if (j !== 0 && j !== last && !route[j].control) continue;
      const axis = horizontal(route[i], route[j]) ? 'y' : 'x';
      bend[axis] = anchors[j][axis];
    }
    anchors[i] = bend;
  }
  const result: Point[] = [source];
  function append(p: Point): void {
    const b = result[result.length - 1];
    if (Math.abs(b.x - p.x) < 0.00001 && Math.abs(b.y - p.y) < 0.00001) return;
    const a = result[result.length - 2];
    // A collinear reversal can contain a saved handle beyond the next corner.
    // Only simplify points between their neighbours.
    if (
      a &&
      ((a.x === b.x && b.x === p.x) || (a.y === b.y && b.y === p.y)) &&
      (b.x - a.x) * (p.x - b.x) + (b.y - a.y) * (p.y - b.y) >= 0
    )
      result.pop();
    result.push(p);
  }
  // On a straight connection the midpoint owns the whole horizontal span.
  // Leave a short horizontal lead at each port when that span is dragged away.
  if (
    route.length === 3 &&
    route[1].control &&
    handles[0] &&
    horizontal(route[0], route[1]) &&
    horizontal(route[1], route[2]) &&
    source.x < handles[0].x &&
    handles[0].x < target.x
  ) {
    const handle = handles[0];
    const fromX = source.x + Math.min(12, (handle.x - source.x) / 2);
    const toX = target.x - Math.min(12, (target.x - handle.x) / 2);
    append({ x: fromX, y: source.y });
    append({ x: fromX, y: handle.y });
    append(handle);
    append({ x: toX, y: handle.y });
    append({ x: toX, y: target.y });
    append(target);
    return result;
  }
  // Consecutive fixed handles may need a local dogleg. Its orientation is inherited
  // from the original leg, so crossing an alignment never flips a distant section.
  for (let i = 1; i <= last; i++) {
    const a = anchors[i - 1],
      b = anchors[i];
    if ((i === 1 || i === last) && b.x < a.x) {
      const sx = i === 1 ? a.x + 12 : a.x,
        tx = i === last ? b.x - 12 : b.x;
      const y = a.y === b.y ? a.y + 12 : (a.y + b.y) / 2;
      append({ x: sx, y: a.y });
      append({ x: sx, y });
      append({ x: tx, y });
      append({ x: tx, y: b.y });
    } else if (a.x !== b.x && a.y !== b.y) {
      if (horizontal(route[i - 1], route[i])) {
        const x = (a.x + b.x) / 2;
        append({ x, y: a.y });
        append({ x, y: b.y });
      } else {
        const y = (a.y + b.y) / 2;
        append({ x: a.x, y });
        append({ x: b.x, y });
      }
    }
    append(b);
  }
  return result;
}
