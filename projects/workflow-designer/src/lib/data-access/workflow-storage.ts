import {
  canConnect,
  type WorkflowConnection,
  type WorkflowNode,
  type WorkflowPosition,
} from '../domain/workflow-graph';

export const workflowStorageKey = 'process-studio.workflow';

export interface WorkflowViewport {
  readonly position: WorkflowPosition;
  readonly scale: number;
  readonly width: number;
  readonly height: number;
}

interface RestoredWorkflow {
  readonly nodes: readonly WorkflowNode[];
  readonly connections: readonly WorkflowConnection[];
  readonly viewport: WorkflowViewport;
}

type LoadResult =
  | { readonly status: 'restored'; readonly graph: RestoredWorkflow }
  | { readonly status: 'empty' | 'invalid' | 'unavailable' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPoint(value: unknown): value is WorkflowPosition {
  return isRecord(value) && Number.isFinite(value['x']) && Number.isFinite(value['y']);
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isViewport(value: unknown): value is WorkflowViewport {
  return (
    isRecord(value) &&
    isPoint(value['position']) &&
    isPositive(value['scale']) &&
    isPositive(value['width']) &&
    isPositive(value['height'])
  );
}

function isConnection(value: unknown): value is WorkflowConnection {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].length > 0 &&
    typeof value['sourceId'] === 'string' &&
    typeof value['targetId'] === 'string'
  );
}

function decode(value: unknown, steps: readonly WorkflowNode[]): RestoredWorkflow | undefined {
  if (!isRecord(value) || value['version'] !== 1) return;
  const { nodes, connections, viewport } = value;
  if (
    !Array.isArray(nodes) ||
    nodes.length !== steps.length ||
    !Array.isArray(connections) ||
    !isViewport(viewport)
  ) {
    return;
  }

  const positions = new Map<string, WorkflowPosition>();
  for (const item of nodes) {
    if (!isRecord(item) || typeof item['id'] !== 'string' || !isPoint(item['position'])) return;
    positions.set(item['id'], item['position']);
  }
  const restoredNodes: WorkflowNode[] = [];
  for (const step of steps) {
    const position = positions.get(step.id);
    if (!position) return;
    restoredNodes.push({ ...step, position });
  }

  const edges: WorkflowConnection[] = [];
  for (const item of connections) {
    if (
      !isConnection(item) ||
      edges.some((edge) => edge.id === item.id) ||
      !canConnect(steps, edges, item.sourceId, item.targetId)
    ) {
      return;
    }
    edges.push({ id: item.id, sourceId: item.sourceId, targetId: item.targetId });
  }
  return { nodes: restoredNodes, connections: edges, viewport };
}

export function loadWorkflow(steps: readonly WorkflowNode[]): LoadResult {
  let raw: string | null;
  try {
    raw = globalThis.localStorage.getItem(workflowStorageKey);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty' };
  try {
    const graph = decode(JSON.parse(raw), steps);
    if (graph) return { status: 'restored', graph };
  } catch {
    // Fall back to the initial graph when the stored text is not valid JSON.
  }
  return { status: 'invalid' };
}

export function saveWorkflow(
  nodes: readonly WorkflowNode[],
  connections: readonly WorkflowConnection[],
  viewport: WorkflowViewport,
): boolean {
  const snapshot = {
    version: 1,
    nodes: nodes.map(({ id, position }) => ({ id, position })),
    connections,
    viewport,
  };
  try {
    globalThis.localStorage.setItem(workflowStorageKey, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}
