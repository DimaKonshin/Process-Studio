import { Injectable, signal } from '@angular/core';

import type { WorkflowConnection, WorkflowNode, WorkflowPosition } from '../domain/workflow-graph';

const initialNodes: readonly WorkflowNode[] = [
  {
    id: 'request-created',
    kind: 'start',
    title: 'Заявка создана',
    position: { x: 0, y: 0 },
    outputId: 'request-created:out',
  },
  {
    id: 'review-request',
    kind: 'task',
    title: 'Проверить заявку',
    position: { x: 350, y: 76 },
    inputId: 'review-request:in',
  },
];

@Injectable()
export class WorkflowCanvasState {
  private readonly nodeList = signal(initialNodes);
  private readonly connectionList = signal<readonly WorkflowConnection[]>([]);

  readonly nodes = this.nodeList.asReadonly();
  readonly connections = this.connectionList.asReadonly();

  moveNodes(moves: readonly { id: string; position: WorkflowPosition }[]): void {
    this.nodeList.update((nodes) =>
      nodes.map((node) => {
        const move = moves.find(({ id }) => id === node.id);
        return move ? { ...node, position: { x: move.position.x, y: move.position.y } } : node;
      }),
    );
  }

  connect(sourceId: string, targetId: string | undefined): void {
    const nodes = this.nodes();
    if (
      !targetId ||
      !nodes.some((n) => n.outputId === sourceId) ||
      !nodes.some((n) => n.inputId === targetId)
    ) {
      return;
    }

    this.connectionList.update((connections) =>
      connections.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId)
        ? connections
        : [...connections, { id: crypto.randomUUID(), sourceId, targetId }],
    );
  }
}
