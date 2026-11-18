import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { FCanvasComponent, FFlowModule } from '@foblex/flow';

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
  private readonly surface = viewChild.required('surface', { read: ElementRef<HTMLElement> });
  protected readonly messages = {
    empty: '',
    restored: 'Сохранённая схема загружена.',
    invalid: 'Не удалось прочитать сохранение. Открыта исходная схема.',
    unavailable: 'Хранилище браузера недоступно.',
    modified: 'Есть несохранённые изменения.',
    saved: 'Схема сохранена в этом браузере.',
    'save-error': 'Не удалось сохранить схему в этом браузере. Можно попробовать ещё раз.',
  };
  protected readonly graph = inject(WorkflowCanvasState);

  protected openCanvas(canvas: FCanvasComponent): void {
    const { clientWidth, clientHeight } = this.surface().nativeElement;
    const view = this.graph.initialViewport;
    if (!view || view.width !== clientWidth || view.height !== clientHeight) {
      canvas.fitToScreen({ x: 32, y: 32 }, false, false, 1);
    }
  }

  protected save(canvas: FCanvasComponent): void {
    const { clientWidth, clientHeight } = this.surface().nativeElement;
    const { x, y } = canvas.getPosition();
    this.graph.save({
      position: { x, y },
      scale: canvas.getScale(),
      width: clientWidth,
      height: clientHeight,
    });
  }
}
