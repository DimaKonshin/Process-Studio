import { createWorkflowNode, type WorkflowDefinition } from 'workflow-designer';

export const expenseApproval: WorkflowDefinition = {
  id: 'expenses',
  title: 'Заявка на затраты',
  nodes: [
    createWorkflowNode('submit', 'start', 'Заявка создана', { x: 0, y: 95 }),
    createWorkflowNode('check', 'task', 'Проверить смету', { x: 275, y: 95 }),
    createWorkflowNode('approve', 'approval', 'Согласовать затраты', { x: 550, y: 45 }),
    createWorkflowNode('pay', 'finish', 'Передано на оплату', { x: 855, y: 95 }),
  ],
  connections: [
    { id: 'submitted', sourceId: 'submit:out', targetId: 'check:in' },
    { id: 'checked', sourceId: 'check:out', targetId: 'approve:in' },
    { id: 'accepted', sourceId: 'approve:approved', targetId: 'pay:in' },
    {
      id: 'revision',
      sourceId: 'approve:rejected',
      targetId: 'check:in',
      waypoints: [{ x: 500, y: 225 }],
    },
  ],
};

export const leaveRequest: WorkflowDefinition = {
  id: 'leave',
  title: 'Заявка на отпуск',
  nodes: [
    createWorkflowNode('submit', 'start', 'Отпуск запрошен', { x: 0, y: 122 }),
    createWorkflowNode('approve', 'approval', 'Согласовать даты', { x: 280, y: 80 }),
    createWorkflowNode('schedule', 'task', 'Внести в график', { x: 580, y: 0 }),
    createWorkflowNode('booked', 'finish', 'Отпуск оформлен', { x: 860, y: 0 }),
    createWorkflowNode('declined', 'finish', 'Заявка отклонена', { x: 580, y: 210 }),
  ],
  connections: [
    { id: 'submitted', sourceId: 'submit:out', targetId: 'approve:in' },
    { id: 'accepted', sourceId: 'approve:approved', targetId: 'schedule:in' },
    { id: 'scheduled', sourceId: 'schedule:out', targetId: 'booked:in' },
    { id: 'declined-path', sourceId: 'approve:rejected', targetId: 'declined:in' },
  ],
};
