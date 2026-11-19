import { computed, signal } from '@angular/core';

import {
  canConnect,
  createWorkflowNode,
  addableStepKinds,
  type WorkflowStepKind,
  type WorkflowConnection,
  type WorkflowNode,
  type WorkflowPosition,
  type RouteVertex,
} from '../domain/workflow-graph';

import { defaultWorkflow, type WorkflowDefinition } from '../domain/workflow-definition';
import {
  loadWorkflow,
  saveWorkflow,
  storageKeyForWorkflow,
  type WorkflowViewport,
} from './workflow-storage';

type SaveStatus = ReturnType<typeof loadWorkflow>['status'] | 'modified' | 'saved' | 'save-error';

export class WorkflowCanvasState {
  private readonly nodeList;
  private readonly connectionList;
  private readonly saveStatus;
  private readonly storageKey: string;
  readonly initialViewport?: WorkflowViewport;

  readonly nodes;
  readonly connections;
  readonly status;

  constructor(definition: WorkflowDefinition = defaultWorkflow) {
    this.storageKey = storageKeyForWorkflow(definition.id);
    const loaded = loadWorkflow(definition.nodes, this.storageKey);
    const saved = loaded.status === 'restored' ? loaded.graph : undefined;
    this.nodeList = signal(saved?.nodes ?? definition.nodes);
    this.connectionList = signal(saved?.connections ?? definition.connections);
    this.saveStatus = signal<SaveStatus>(loaded.status);
    this.nodes = this.nodeList.asReadonly();
    this.connections = this.connectionList.asReadonly();
    this.status = this.saveStatus.asReadonly();
    this.initialViewport = saved?.viewport;
  }

  readonly availableStepKinds = computed<readonly WorkflowStepKind[]>(() =>
    this.nodes().some((node) => node.kind === 'start')
      ? addableStepKinds
      : [...addableStepKinds, 'start'],
  );

  addStep(kind: WorkflowStepKind, title: string, position: WorkflowPosition): string | undefined {
    const name = title.trim();
    if (!name || !this.availableStepKinds().includes(kind)) return;
    const node = createWorkflowNode(crypto.randomUUID(), kind, name, position);
    this.nodeList.update((nodes) => [...nodes, node]);
    this.saveStatus.set('modified');
    return node.id;
  }

  renameStep(id: string, title: string): void {
    const name = title.trim();
    const nodes = this.nodes();
    const current = nodes.find((node) => node.id === id);
    if (!current || !name || current.title === name) return;
    this.nodeList.set(nodes.map((node) => (node.id === id ? { ...node, title: name } : node)));
    this.saveStatus.set('modified');
  }

  removeStep(id: string): void {
    const nodes = this.nodes();
    const step = nodes.find((node) => node.id === id);
    if (!step) return;
    const outputs = new Set(step.outputs.map((port) => port.id));
    this.connectionList.update((edges) =>
      edges.filter((edge) => edge.targetId !== step.inputId && !outputs.has(edge.sourceId)),
    );
    this.nodeList.set(nodes.filter((node) => node.id !== id));
    this.saveStatus.set('modified');
  }

  moveNodes(moves: readonly { id: string; position: WorkflowPosition }[]): void {
    const nodes = this.nodes();
    const next = nodes.map((node) => {
      const move = moves.find(({ id }) => id === node.id);
      if (!move || (move.position.x === node.position.x && move.position.y === node.position.y))
        return node;
      return { ...node, position: { x: move.position.x, y: move.position.y } };
    });
    if (next.some((node, i) => node !== nodes[i])) {
      this.nodeList.set(next);
      this.saveStatus.set('modified');
    }
  }

  connect(sourceId: string, targetId: string | undefined): void {
    const edges = this.connections();
    if (!targetId || !canConnect(this.nodes(), edges, sourceId, targetId)) {
      return;
    }
    this.connectionList.set([...edges, { id: crypto.randomUUID(), sourceId, targetId }]);
    this.saveStatus.set('modified');
  }

  setWaypoints(
    id: string,
    points: readonly WorkflowPosition[],
    route?: readonly RouteVertex[],
  ): void {
    const edges = this.connections();
    const edge = edges.find((item) => item.id === id);
    if (!edge) return;
    const previous = edge.waypoints ?? [];
    if (
      points.length === previous.length &&
      points.every((p, i) => p.x === previous[i].x && p.y === previous[i].y)
    )
      return;
    const waypoints = points.map(({ x, y }) => ({ x, y }));
    this.connectionList.set(
      edges.map((item) => (item === edge ? { ...edge, waypoints, route } : item)),
    );
    this.saveStatus.set('modified');
  }

  removeConnection(id: string): void {
    const edges = this.connections();
    const remaining = edges.filter((edge) => edge.id !== id);
    if (remaining.length === edges.length) return;
    this.connectionList.set(remaining);
    this.saveStatus.set('modified');
  }

  save(viewport: WorkflowViewport): void {
    const saved = saveWorkflow(this.nodes(), this.connections(), viewport, this.storageKey);
    this.saveStatus.set(saved ? 'saved' : 'save-error');
  }
}
