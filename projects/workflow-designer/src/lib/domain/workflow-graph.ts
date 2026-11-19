export interface WorkflowPosition {
  readonly x: number;
  readonly y: number;
}

export const addableStepKinds = ['task', 'approval', 'finish'] as const;
export type AddableStepKind = (typeof addableStepKinds)[number];
export type WorkflowStepKind = 'start' | AddableStepKind;
export type ApprovalOutcome = 'approved' | 'rejected';

export function isWorkflowStepKind(value: unknown): value is WorkflowStepKind {
  return value === 'start' || addableStepKinds.some((kind) => kind === value);
}

export interface WorkflowOutput {
  readonly id: string;
  readonly outcome?: ApprovalOutcome;
}

export interface WorkflowNode {
  readonly id: string;
  readonly kind: WorkflowStepKind;
  readonly title: string;
  readonly position: WorkflowPosition;
  readonly inputId?: string;
  readonly outputs: readonly WorkflowOutput[];
}

export interface WorkflowConnection {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly waypoints?: readonly WorkflowPosition[];
}

function outputsFor(id: string, kind: WorkflowStepKind): WorkflowOutput[] {
  switch (kind) {
    case 'finish':
      return [];
    case 'approval':
      return [
        { id: `${id}:approved`, outcome: 'approved' },
        { id: `${id}:rejected`, outcome: 'rejected' },
      ];
    default:
      return [{ id: `${id}:out` }];
  }
}

export function createWorkflowNode(
  id: string,
  kind: WorkflowStepKind,
  title: string,
  position: WorkflowPosition,
): WorkflowNode {
  return {
    id,
    kind,
    title,
    position,
    inputId: kind === 'start' ? undefined : `${id}:in`,
    outputs: outputsFor(id, kind),
  };
}

export function canConnect(
  nodes: readonly WorkflowNode[],
  edges: readonly WorkflowConnection[],
  sourceId: string,
  targetId: string,
): boolean {
  return (
    nodes.some((node) => node.outputs.some((port) => port.id === sourceId)) &&
    nodes.some((node) => node.inputId === targetId) &&
    !edges.some((edge) => edge.sourceId === sourceId && edge.targetId === targetId)
  );
}
