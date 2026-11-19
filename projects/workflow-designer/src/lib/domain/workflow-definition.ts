import { createWorkflowNode, type WorkflowConnection, type WorkflowNode } from './workflow-graph';

export interface WorkflowDefinition {
  readonly id: string;
  readonly title: string;
  readonly nodes: readonly WorkflowNode[];
  readonly connections: readonly WorkflowConnection[];
}

export const defaultWorkflow: WorkflowDefinition = {
  id: 'default',
  title: 'Процесс по умолчанию',
  nodes: [
    createWorkflowNode('request-created', 'start', 'Заявка создана', { x: 0, y: 0 }),
    createWorkflowNode('review-request', 'task', 'Проверить заявку', { x: 350, y: 76 }),
  ],
  connections: [],
};
