import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'wf-workflow-designer',
  templateUrl: './workflow-designer.component.html',
  styleUrl: './workflow-designer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowDesignerComponent {}
