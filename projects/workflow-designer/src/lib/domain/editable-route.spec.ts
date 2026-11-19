import { constrainHandles, editablePolyline, removeRouteControl } from './editable-route';
import { captureRoute, singleSegmentFrame } from './route-sites';

describe('editing the return leg beside an input', () => {
  const p = (x: number, y: number) => ({ x, y });
  const vertices = [p(710, 85), p(726, 85), p(726, 130), p(260, 130), p(260, 170), p(280, 170)];
  const frame = captureRoute(vertices, [p(260, 150)]);
  it('slides the vertical leg sideways and keeps the remote corners and port fixed', () => {
    const h = constrainHandles(frame, [p(220, 95)], vertices[0], vertices[5]);
    expect(h).toEqual([p(220, 150)]);
    const path = editablePolyline(frame, h, vertices[0], vertices[5]);
    expect(path).toEqual([...vertices.slice(0, 3), p(220, 130), p(220, 170), vertices[5]]);
  });
  it('keeps the turnaround that lies beyond its neighbouring bend when a second handle moves', () => {
    const a = p(0, 0),
      b = p(150, 100);
    const frame = captureRoute([a, p(50, 0), p(50, 100), b], [p(25, 0), p(50, 50)]);
    const handles = constrainHandles(frame, [p(25, 140), p(65, 50)], a, b);
    const path = editablePolyline(frame, handles, a, b);
    expect(captureRoute(path, handles).filter((v) => v.control)).toHaveLength(2);
  });
  it('moves the entire return span after deleting a control from a split horizontal leg', () => {
    const rightHalf = p(650, 115);
    const middle = p(493, 130);
    const split = captureRoute(
      [vertices[0], vertices[1], p(726, 115), p(600, 115), p(600, 130), ...vertices.slice(3)],
      [rightHalf, middle],
    );
    const restored = singleSegmentFrame(vertices, split, 1, middle)!;
    for (const y of [130, 145, 100]) {
      const handles = constrainHandles(restored, [p(493, y)], vertices[0], vertices[5]);
      expect(editablePolyline(restored, handles, vertices[0], vertices[5])).toEqual([
        vertices[0],
        vertices[1],
        p(726, y),
        p(260, y),
        vertices[4],
        vertices[5],
      ]);
    }
    const legacy = split.map((v) => (v.x === 650 ? p(v.x, v.y) : v));
    expect(singleSegmentFrame(vertices, legacy, 0, middle)).toEqual(restored);
  });

  it('keeps a lowered return span when its midpoint is removed and the left leg still has a handle', () => {
    const path = [vertices[0], vertices[1], p(726, 220), p(260, 220), vertices[4], vertices[5]];
    const mid = p(493, 220),
      left = p(260, 195);
    const edit = removeRouteControl(
      captureRoute(path, [mid, left]),
      [mid, left],
      0,
      path[0],
      path[5],
    );
    expect(edit.points).toEqual([left]);
    expect(editablePolyline(edit.route, edit.points, path[0], path[5])).toEqual(path);

    const renewed = captureRoute(path, [mid, left]);
    const moved = constrainHandles(renewed, [p(mid.x, 260), left], path[0], path[5], 0);
    expect(editablePolyline(renewed, moved, path[0], path[5])).toEqual([
      path[0],
      path[1],
      p(726, 260),
      p(260, 260),
      path[4],
      path[5],
    ]);
  });

  it('keeps the left midpoint on its vertical leg as the horizontal span passes its old height', () => {
    const path = [vertices[0], vertices[1], p(726, 220), p(260, 220), vertices[4], vertices[5]];
    const mid = p(493, 220),
      left = p(260, 195);
    const frame = captureRoute(path, [mid, left]);
    const handles = constrainHandles(frame, [p(mid.x, 180), left], path[0], path[5], 0);
    expect(handles[1]).toEqual(p(260, 175));
    expect(editablePolyline(frame, handles, path[0], path[5])).toEqual([
      path[0],
      path[1],
      p(726, 180),
      p(260, 180),
      path[4],
      path[5],
    ]);
  });

  it('moves a selected span and its marked corner together in either drag direction', () => {
    const mid = p(493, 130),
      corner = vertices[3];
    const frame = captureRoute(vertices, [mid, corner]);
    const end = vertices[5];
    const handles = constrainHandles(frame, [p(mid.x, 112), corner], vertices[0], end, 0);
    expect(handles).toEqual([p(mid.x, 112), p(corner.x, 112)]);
    expect(editablePolyline(frame, handles, vertices[0], end)).toEqual([
      vertices[0],
      vertices[1],
      p(726, 112),
      p(260, 112),
      vertices[4],
      end,
    ]);
    expect(constrainHandles(frame, [mid, p(245, 116)], vertices[0], end, 1)).toEqual([
      p((726 + 245) / 2, 116),
      p(245, 116),
    ]);
  });

  it('releases the offset of a deleted midpoint when two midpoints split the same span', () => {
    const a = p(615, 130),
      b = p(493, 130),
      shifted = p(a.x, 115);
    const edit = removeRouteControl(
      captureRoute(vertices, [a, b]),
      [shifted, b],
      0,
      vertices[0],
      vertices[5],
    );
    expect(edit.points).toEqual([b]);
    expect(editablePolyline(edit.route, edit.points, vertices[0], vertices[5])).toEqual(vertices);
  });

  it('translates a straight connection as one span between the two port leads', () => {
    const straight = [p(0, 0), p(200, 0)];
    const frame = captureRoute(straight, [p(100, 0)]);
    expect(editablePolyline(frame, [p(100, 0)], straight[0], straight[1])).toEqual(straight);
    expect(editablePolyline(frame, [p(100, 40)], straight[0], straight[1])).toEqual([
      p(0, 0),
      p(12, 0),
      p(12, 40),
      p(188, 40),
      p(188, 0),
      p(200, 0),
    ]);
  });

  it('keeps an outward lead when dragged beyond the input', () => {
    const h = constrainHandles(frame, [p(400, 10)], vertices[0], vertices[5]);
    expect(h[0].x).toBeLessThan(vertices[5].x);
  });
});
