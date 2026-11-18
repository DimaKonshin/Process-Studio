export interface WorkflowPosition {
  readonly x: number;
  readonly y: number;
}

export interface WorkflowNode {
  readonly id: string;
  readonly kind: 'start' | 'task';
  readonly title: string;
  readonly position: WorkflowPosition;
  readonly inputId?: string;
  readonly outputId?: string;
}

export interface WorkflowConnection {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
}

export function canConnect(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowConnection[],
  sourceId: string,
  targetId: string,
): boolean {
  return (
    nodes.some((node) => node.outputId === sourceId) &&
    nodes.some((node) => node.inputId === targetId) &&
    !edges.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId)
  );
}
