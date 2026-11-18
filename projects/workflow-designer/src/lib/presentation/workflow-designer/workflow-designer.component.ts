import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FFlowModule } from '@foblex/flow';

import { WorkflowCanvasState } from '../../data-access/workflow-canvas-state';

@Component({
  selector: 'wf-workflow-designer',
  imports: [FFlowModule],
  providers: [WorkflowCanvasState],
  templateUrl: './workflow-designer.component.html',
  styleUrl: './workflow-designer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowDesignerComponent {
  protected readonly graph = inject(WorkflowCanvasState);
}
