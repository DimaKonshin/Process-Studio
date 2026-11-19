import { defaultWorkflow, removeSavedWorkflow, type WorkflowDefinition } from 'workflow-designer';

import { expenseApproval, leaveRequest } from '../domain/process-examples';

const builtIns = [defaultWorkflow, expenseApproval, leaveRequest];
const titlePrefix = 'process-studio.process-title.';

const removedPrefix = 'process-studio.removed-process.';

function customProcess(id: string, title: string): WorkflowDefinition {
  return { id, title, nodes: [], connections: [] };
}

export function listProcesses(): WorkflowDefinition[] {
  const custom: WorkflowDefinition[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(titlePrefix)) continue;
      const title = localStorage.getItem(key);
      if (title) custom.push(customProcess(key.slice(titlePrefix.length), title));
    }
  } catch {
    // The built-in processes are available even when browser storage is blocked.
  }
  const visibleBuiltIns = builtIns.filter((process) => findProcess(process.id));
  return [...visibleBuiltIns, ...custom.sort((a, b) => a.title.localeCompare(b.title, 'ru'))];
}

export function findProcess(id: string): WorkflowDefinition | undefined {
  const builtIn = builtIns.find((process) => process.id === id);
  try {
    if (builtIn) return localStorage.getItem(removedPrefix + id) === null ? builtIn : undefined;
    const title = localStorage.getItem(titlePrefix + id);
    return title ? customProcess(id, title) : undefined;
  } catch {
    return builtIn;
  }
}

export function createProcess(name: string): WorkflowDefinition {
  const title = name.trim();
  if (!title) throw new Error('Название процесса обязательно');
  const id = crypto.randomUUID();
  localStorage.setItem(titlePrefix + id, title);
  return customProcess(id, title);
}

export function deleteProcess(id: string): void {
  const builtIn = builtIns.some((process) => process.id === id);
  const key = (builtIn ? removedPrefix : titlePrefix) + id;
  const previous = localStorage.getItem(key);
  if (builtIn) {
    localStorage.setItem(key, '1');
  } else {
    localStorage.removeItem(key);
  }
  try {
    removeSavedWorkflow(id);
  } catch (error) {
    if (previous === null) localStorage.removeItem(key);
    else localStorage.setItem(key, previous);
    throw error;
  }
}
