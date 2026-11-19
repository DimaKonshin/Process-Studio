import { constrainHandles, editablePolyline } from './editable-route';
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
