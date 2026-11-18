import { Injectable, signal } from '@angular/core';

import {
  canConnect,
  createWorkflowNode,
  type AddableStepKind,
  type WorkflowConnection,
  type WorkflowNode,
  type WorkflowPosition,
} from '../domain/workflow-graph';

import { loadWorkflow, saveWorkflow, type WorkflowViewport } from './workflow-storage';

type SaveStatus = ReturnType<typeof loadWorkflow>['status'] | 'modified' | 'saved' | 'save-error';

const initialNodes: readonly WorkflowNode[] = [
  createWorkflowNode('request-created', 'start', 'Заявка создана', { x: 0, y: 0 }),
  createWorkflowNode('review-request', 'task', 'Проверить заявку', { x: 350, y: 76 }),
];

@Injectable()
export class WorkflowCanvasState {
  private readonly initial = loadWorkflow(initialNodes);
  private readonly restored = this.initial.status === 'restored' ? this.initial.graph : undefined;
  private readonly nodeList = signal(this.restored?.nodes ?? initialNodes);
  private readonly connectionList = signal<readonly WorkflowConnection[]>(
    this.restored?.connections ?? [],
  );
  private readonly saveStatus = signal<SaveStatus>(this.initial.status);

  readonly initialViewport = this.restored?.viewport;
  readonly status = this.saveStatus.asReadonly();
  readonly nodes = this.nodeList.asReadonly();
  readonly connections = this.connectionList.asReadonly();

  addStep(kind: AddableStepKind, title: string, position: WorkflowPosition): string | undefined {
    const name = title.trim();
    if (!name) return;
    const node = createWorkflowNode(crypto.randomUUID(), kind, name, position);
    this.nodeList.update((nodes) => [...nodes, node]);
    this.saveStatus.set('modified');
    return node.id;
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

  save(viewport: WorkflowViewport): void {
    const saved = saveWorkflow(this.nodes(), this.connections(), viewport);
    this.saveStatus.set(saved ? 'saved' : 'save-error');
  }
}
