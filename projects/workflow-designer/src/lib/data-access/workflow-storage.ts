import {
  canConnect,
  createWorkflowNode,
  isWorkflowStepKind,
  type WorkflowConnection,
  type WorkflowNode,
  type WorkflowPosition,
  type RouteVertex,
} from '../domain/workflow-graph';

import { defaultWorkflow } from '../domain/workflow-definition';

export const workflowStorageKey = 'process-studio.workflow';

export function storageKeyForWorkflow(id: string): string {
  return id === defaultWorkflow.id ? workflowStorageKey : `${workflowStorageKey}.${id}`;
}

export function removeSavedWorkflow(id: string): void {
  localStorage.removeItem(storageKeyForWorkflow(id));
}

export interface WorkflowViewport {
  readonly position: WorkflowPosition;
  readonly scale: number;
  readonly width: number;
  readonly height: number;
  readonly windowSize?: { readonly width: number; readonly height: number };
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
    isPositive(value['height']) &&
    (value['windowSize'] === undefined ||
      (isRecord(value['windowSize']) &&
        isPositive(value['windowSize']['width']) &&
        isPositive(value['windowSize']['height'])))
  );
}

function isRoute(value: unknown, count: number): value is readonly RouteVertex[] | undefined {
  if (value === undefined) return true;
  if (!Array.isArray(value) || value.length < 2 || !count) return false;
  let controls = 0;
  for (const [i, v] of value.entries()) {
    if (!isRecord(v) || !isPoint(v)) return false;
    if ('control' in v) {
      if (v['control'] !== true || i === 0 || i === value.length - 1) return false;
      controls++;
    }
    if (i && Math.min(Math.abs(v.x - value[i - 1].x), Math.abs(v.y - value[i - 1].y)) > 0.01)
      return false;
  }
  return controls === count;
}

function isConnection(
  value: unknown,
): value is Omit<WorkflowConnection, 'route'> & { route?: unknown } {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    value['id'].length > 0 &&
    typeof value['sourceId'] === 'string' &&
    typeof value['targetId'] === 'string' &&
    (value['waypoints'] === undefined ||
      (Array.isArray(value['waypoints']) && value['waypoints'].every(isPoint)))
  );
}

function readNodes(
  items: unknown[],
  version: 1 | 2,
  initialNodes: readonly WorkflowNode[],
): WorkflowNode[] | undefined {
  // Version 1 stored only the positions of the two predefined steps.
  if (version === 1 && items.length !== initialNodes.length) return;

  const nodes = new Map<string, WorkflowNode>();
  for (const item of items) {
    if (!isRecord(item)) return;
    const { id, position } = item;
    if (typeof id !== 'string' || !id.trim() || nodes.has(id) || !isPoint(position)) return;

    const definition = version === 1 ? initialNodes.find((node) => node.id === id) : item;
    if (!definition) return;
    const { kind, title } = definition;
    if (!isWorkflowStepKind(kind) || typeof title !== 'string' || !title.trim()) return;
    nodes.set(id, createWorkflowNode(id, kind, title, position));
  }
  return [...nodes.values()];
}

function decode(value: unknown, steps: readonly WorkflowNode[]): RestoredWorkflow | undefined {
  if (!isRecord(value)) return;
  const { version, nodes, connections, viewport } = value;
  if (
    (version !== 1 && version !== 2) ||
    !Array.isArray(nodes) ||
    !Array.isArray(connections) ||
    !isViewport(viewport)
  )
    return;

  const restoredNodes = readNodes(nodes, version, steps);
  if (!restoredNodes) return;

  const edges: WorkflowConnection[] = [];
  for (const item of connections) {
    if (
      !isConnection(item) ||
      edges.some((edge) => edge.id === item.id) ||
      !canConnect(restoredNodes, edges, item.sourceId, item.targetId)
    ) {
      return;
    }
    edges.push({
      id: item.id,
      sourceId: item.sourceId,
      targetId: item.targetId,
      ...(item.waypoints && { waypoints: item.waypoints }),
      ...(item.route && isRoute(item.route, item.waypoints?.length ?? 0)
        ? { route: item.route }
        : {}),
    });
  }
  return { nodes: restoredNodes, connections: edges, viewport };
}

export function loadWorkflow(steps: readonly WorkflowNode[], storageKey: string): LoadResult {
  let raw: string | null;
  try {
    raw = globalThis.localStorage.getItem(storageKey);
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
  storageKey: string,
): boolean {
  const snapshot = {
    version: 2,
    nodes: nodes.map(({ id, kind, title, position }) => ({ id, kind, title, position })),
    connections,
    viewport,
  };
  try {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}
