import { TestBed } from '@angular/core/testing';

import { WorkflowCanvasState } from '../../data-access/workflow-canvas-state';
import { WorkflowDesignerComponent } from './workflow-designer.component';

describe('WorkflowDesignerComponent', () => {
  it('starts each editor with its own unconnected graph', () => {
    const first = TestBed.createComponent(WorkflowDesignerComponent);
    const second = TestBed.createComponent(WorkflowDesignerComponent);
    const graph = first.debugElement.injector.get(WorkflowCanvasState);
    const [start, task] = graph.nodes();

    graph.connect(start.outputs[0].id, task.inputId);
    expect(graph.connections()).toHaveLength(1);
    expect(second.debugElement.injector.get(WorkflowCanvasState).connections()).toEqual([]);
  });
});
