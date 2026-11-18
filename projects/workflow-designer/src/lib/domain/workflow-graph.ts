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
