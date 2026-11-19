import { defaultWorkflow } from 'workflow-designer';
import { createProcess, deleteProcess, findProcess, listProcesses } from './process-catalog';

describe('process catalog', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('keeps two processes with the same title as independent blank documents', () => {
    const first = createProcess('  Мой процесс ');
    const second = createProcess('Мой процесс');
    expect(first.id).not.toBe(second.id);
    expect(findProcess(first.id)).toEqual({
      ...first,
      title: 'Мой процесс',
      nodes: [],
      connections: [],
    });
    expect(listProcesses()).toEqual(expect.arrayContaining([first, second, defaultWorkflow]));
  });

  it('removes only the chosen process and its saved diagram for duplicate names', () => {
    const first = createProcess('Заявка');
    const second = createProcess('Заявка');
    for (const { id } of [first, second]) localStorage.setItem('process-studio.workflow.' + id, id);
    deleteProcess(first.id);
    expect(findProcess(first.id)).toBeUndefined();
    expect(listProcesses()).not.toContainEqual(first);
    expect(localStorage.getItem('process-studio.workflow.' + first.id)).toBeNull();
    expect(findProcess(second.id)).toEqual(second);
    expect(localStorage.getItem('process-studio.workflow.' + second.id)).toBe(second.id);
  });

  it.each([
    [defaultWorkflow.id, 'process-studio.workflow'],
    ['expenses', 'process-studio.workflow.expenses'],
    ['leave', 'process-studio.workflow.leave'],
  ])('removes built-in %s and its snapshot across catalog reads', (id, key) => {
    localStorage.setItem(key, 'saved');
    deleteProcess(id);
    deleteProcess(id);
    expect(listProcesses()).toHaveLength(2);
    expect(findProcess(id)).toBeUndefined();
    expect(listProcesses().map((process) => process.id)).not.toContain(id);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it('retains the catalog entry when the saved diagram cannot be removed', () => {
    const process = createProcess('Согласование');
    const key = 'process-studio.workflow.' + process.id;
    localStorage.setItem(key, 'saved');
    const remove = Storage.prototype.removeItem;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (
      this: Storage,
      item: string,
    ) {
      if (item === key) throw new Error('blocked');
      remove.call(this, item);
    });
    expect(() => deleteProcess(process.id)).toThrow();
    expect(findProcess(process.id)).toEqual(process);
    expect(localStorage.getItem(key)).toBe('saved');
  });

  it('keeps built-ins available when local storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(findProcess('expenses')?.connections.length).toBeGreaterThan(0);
    expect(findProcess('leave')?.connections.length).toBeGreaterThan(0);
    expect(findProcess('unknown')).toBeUndefined();
  });
});
