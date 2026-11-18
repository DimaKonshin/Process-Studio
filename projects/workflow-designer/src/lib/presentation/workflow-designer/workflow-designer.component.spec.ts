import { TestBed } from '@angular/core/testing';

import { WorkflowDesignerComponent } from './workflow-designer.component';

describe('WorkflowDesignerComponent', () => {
  it('renders the empty workspace', async () => {
    const fixture = TestBed.createComponent(WorkflowDesignerComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('section')?.textContent).toContain('Схема пока пуста');
  });
});
