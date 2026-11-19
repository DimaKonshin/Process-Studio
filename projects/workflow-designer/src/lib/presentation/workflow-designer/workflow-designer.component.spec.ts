import { TestBed } from '@angular/core/testing';

import { WorkflowDesignerComponent } from './workflow-designer.component';

describe('WorkflowDesignerComponent', () => {
  it('starts each editor with its own unconnected graph', () => {
    TestBed.overrideComponent(WorkflowDesignerComponent, {
      set: {
        template: `<button (click)="graph().connect('request-created:out', 'review-request:in')">Connect</button>
          <output>{{ graph().connections().length }}</output>`,
        imports: [],
      },
    });
    const first = TestBed.createComponent(WorkflowDesignerComponent);
    const second = TestBed.createComponent(WorkflowDesignerComponent);
    first.detectChanges();
    second.detectChanges();
    first.nativeElement.querySelector('button').click();
    first.detectChanges();
    second.detectChanges();
    expect(first.nativeElement.querySelector('output').textContent).toBe('1');
    expect(second.nativeElement.querySelector('output').textContent).toBe('0');
  });
});
