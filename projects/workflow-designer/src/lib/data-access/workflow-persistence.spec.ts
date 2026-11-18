import { WorkflowCanvasState } from './workflow-canvas-state';
import { workflowStorageKey } from './workflow-storage';

describe('saving a workflow', () => {
  const view = { position: { x: 15, y: 40 }, scale: 0.8, width: 900, height: 500 };
  const position = { x: -15, y: 91 };

  beforeEach(() => localStorage.removeItem(workflowStorageKey));
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(workflowStorageKey);
  });

  function savedGraph(): WorkflowCanvasState {
    const graph = new WorkflowCanvasState();
    graph.moveNodes([{ id: 'request-created', position }]);
    graph.connect('request-created:out', 'review-request:in');
    graph.save(view);
    return graph;
  }

  it('restores the last explicit save, including port IDs, connection ID and viewport', () => {
    const graph = savedGraph();
    const [edge] = graph.connections();
    expect(JSON.parse(localStorage.getItem(workflowStorageKey)!)).toMatchObject({ version: 2 });
    graph.moveNodes([{ id: 'request-created', position: { x: 100, y: 200 } }]);
    expect(graph.status()).toBe('modified');

    const restored = new WorkflowCanvasState();
    expect(restored.status()).toBe('restored');
    expect(restored.nodes()[0].position).toEqual(position);
    expect(restored.connections()).toEqual([edge]);
    expect(restored.initialViewport).toEqual(view);
  });

  it('loads a version 1 save, appends a task and restores the complete chain from version 2', () => {
    const edge = {
      id: 'original-edge',
      sourceId: 'request-created:out',
      targetId: 'review-request:in',
    };
    localStorage.setItem(
      workflowStorageKey,
      JSON.stringify({
        version: 1,
        nodes: [
          { id: 'request-created', position },
          { id: 'review-request', position: { x: 320, y: 45 } },
        ],
        connections: [edge],
        viewport: view,
      }),
    );

    const graph = new WorkflowCanvasState();
    expect(graph.status()).toBe('restored');
    expect(graph.nodes()[0].position).toEqual(position);
    expect(graph.connections()).toEqual([edge]);
    graph.addStep('task', 'Уведомить автора', { x: 600, y: 40 });
    const task = graph.nodes()[2];
    graph.connect('review-request:out', task.inputId);
    graph.save(view);

    const restored = new WorkflowCanvasState();
    expect(restored.nodes()).toEqual(graph.nodes());
    expect(restored.connections()).toEqual(graph.connections());
    expect(restored.connections()).toHaveLength(2);
    expect(restored.nodes()[2].title).toBe('Уведомить автора');
  });

  it('restores both approval outcomes and the exact finish each leads to', () => {
    const graph = new WorkflowCanvasState();
    const approval = graph.addStep('approval', 'Решение руководителя', position);
    const yes = graph.addStep('finish', 'На оплату', { x: 500, y: 0 });
    const no = graph.addStep('finish', 'Отказано', { x: 500, y: 120 });
    graph.connect('review-request:out', `${approval}:in`);
    graph.connect(`${approval}:approved`, `${yes}:in`);
    graph.connect(`${approval}:rejected`, `${no}:in`);
    graph.save(view);
    const restored = new WorkflowCanvasState();
    expect(restored.status()).toBe('restored');
    expect(restored.nodes()).toEqual(graph.nodes());
    expect(restored.connections()).toEqual(graph.connections());
    expect(restored.connections()).toHaveLength(3);
  });

  it.each([
    ['invalid JSON', '{'],
    ['unknown version', '{"version":10}'],
    ['incomplete data', '{"version":1,"connections":[]}'],
  ])('opens the initial graph on %s and leaves the stored value untouched', (_, raw) => {
    localStorage.setItem(workflowStorageKey, raw);
    const graph = new WorkflowCanvasState();
    expect(graph.status()).toBe('invalid');
    expect(graph.nodes().map((node) => node.id)).toEqual(['request-created', 'review-request']);
    expect(graph.connections()).toEqual([]);
    expect(localStorage.getItem(workflowStorageKey)).toBe(raw);
  });

  it.each(['unknown port', 'duplicate node', 'invalid coordinate', 'duplicate edge'])(
    'rejects the whole save on %s',
    (damage) => {
      savedGraph();
      const snapshot = JSON.parse(localStorage.getItem(workflowStorageKey)!);
      if (damage === 'unknown port') snapshot.connections[0].targetId = 'missing';
      if (damage === 'duplicate node') snapshot.nodes[1].id = snapshot.nodes[0].id;
      if (damage === 'invalid coordinate') snapshot.nodes[0].position.x = null;
      if (damage === 'duplicate edge') snapshot.connections.push(snapshot.connections[0]);
      localStorage.setItem(workflowStorageKey, JSON.stringify(snapshot));

      const graph = new WorkflowCanvasState();
      expect(graph.status()).toBe('invalid');
      expect(graph.connections()).toEqual([]);
    },
  );

  it('keeps live edits and the previous save after a failed write, and can retry', () => {
    const graph = savedGraph();
    const previous = localStorage.getItem(workflowStorageKey);
    graph.moveNodes([{ id: 'request-created', position: { x: 50, y: 75 } }]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    graph.save(view);
    expect(graph.status()).toBe('save-error');
    expect(localStorage.getItem(workflowStorageKey)).toBe(previous);
    graph.save(view);
    expect(graph.status()).toBe('saved');
    expect(new WorkflowCanvasState().nodes()[0].position).toEqual({ x: 50, y: 75 });
  });

  it('continues to open the editor when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
      throw new DOMException('Denied', 'SecurityError');
    });
    const graph = new WorkflowCanvasState();
    expect(graph.status()).toBe('unavailable');
    expect(graph.nodes()).toHaveLength(2);
  });
});
