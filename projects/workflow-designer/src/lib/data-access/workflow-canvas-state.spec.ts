import { WorkflowCanvasState } from './workflow-canvas-state';

describe('WorkflowCanvasState', () => {
  const source = 'request-created:out';
  const target = 'review-request:in';

  it('keeps a single directed connection when either endpoint moves', () => {
    const graph = new WorkflowCanvasState();
    graph.connect(source, target);
    graph.connect(source, target);
    const [connection] = graph.connections();

    const moves = graph.nodes().map(({ id }, i) => ({ id, position: { x: i * 100, y: 80 } }));
    graph.moveNodes(moves);

    expect(graph.nodes().map((n) => n.position)).toEqual(moves.map((m) => m.position));
    expect(graph.connections()).toEqual([connection]);
    expect(connection).toMatchObject({ sourceId: source, targetId: target });
  });

  it('ignores an empty drop, a missing connector, and reversed endpoints', () => {
    const graph = new WorkflowCanvasState();
    graph.connect(source, undefined);
    graph.connect(source, 'missing');
    graph.connect(target, source);
    expect(graph.connections()).toEqual([]);
  });
});
