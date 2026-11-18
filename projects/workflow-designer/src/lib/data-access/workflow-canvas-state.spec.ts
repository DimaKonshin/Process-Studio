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

  it('adds named tasks with unique ports and ignores a blank title', () => {
    const graph = new WorkflowCanvasState();
    graph.addTask('  ', { x: 0, y: 0 });
    expect(graph.nodes()).toHaveLength(2);
    graph.addTask('  Проверить счёт  ', { x: 20, y: 30 });
    graph.addTask('Проверить счёт', { x: 40, y: 50 });
    const [first, second] = graph.nodes().slice(2);
    expect(first).toMatchObject({
      title: 'Проверить счёт',
      kind: 'task',
      position: { x: 20, y: 30 },
    });
    expect(first.id).not.toBe(second.id);
    expect(first.inputId).not.toBe(second.inputId);
    expect(first.outputId).not.toBe(second.outputId);
  });

  it('ignores an empty drop, a missing connector, and reversed endpoints', () => {
    const graph = new WorkflowCanvasState();
    graph.connect(source, undefined);
    graph.connect(source, 'missing');
    graph.connect(target, source);
    expect(graph.connections()).toEqual([]);
  });
});
