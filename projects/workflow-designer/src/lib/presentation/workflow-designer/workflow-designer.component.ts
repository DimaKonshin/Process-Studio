import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { FCanvasComponent, FFlowComponent, FFlowModule } from '@foblex/flow';

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
  private readonly surface = viewChild.required<FFlowComponent, ElementRef<HTMLElement>>(
    'surface',
    { read: ElementRef },
  );
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

  protected addStep(input: HTMLInputElement, flow: FFlowComponent): void {
    const point = this.nextStepPosition();
    this.graph.addTask(input.value, flow.getPositionInFlow(point));
    input.value = '';
    input.focus();
  }

  private nextStepPosition() {
    const surface = this.surface().nativeElement;
    const bounds = surface.getBoundingClientRect();
    const cards = Array.from(surface.querySelectorAll<HTMLElement>('.step'), (card) =>
      card.getBoundingClientRect(),
    );
    const gap = 16;
    if (!cards.length) return { x: bounds.left + gap, y: bounds.top + gap };
    const { width, height } = cards[0];
    const lastX = Math.max(gap, bounds.width - width - gap);
    const lastY = Math.max(gap, bounds.height - height - gap);

    // Prefer a free spot in the current viewport. On a full canvas, stagger new cards.
    for (let y = gap; y <= lastY; y += height + gap) {
      for (let x = gap; x <= lastX; x += width + gap) {
        const left = bounds.left + x;
        const top = bounds.top + y;
        if (
          cards.every(
            (r) =>
              left + width + gap <= r.left ||
              r.right + gap <= left ||
              top + height + gap <= r.top ||
              r.bottom + gap <= top,
          )
        ) {
          return { x: left, y: top };
        }
      }
    }
    const offset = (cards.length % 5) * 8;
    return {
      x: bounds.left + Math.min(lastX, lastX / 2 + offset),
      y: bounds.top + Math.min(lastY, lastY / 2 + offset),
    };
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
