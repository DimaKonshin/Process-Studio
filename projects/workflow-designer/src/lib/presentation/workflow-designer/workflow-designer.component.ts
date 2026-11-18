import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  viewChild,
} from '@angular/core';
import { FCanvasComponent, FFlowComponent, FFlowModule } from '@foblex/flow';

import { WorkflowCanvasState } from '../../data-access/workflow-canvas-state';

import {
  addableStepKinds,
  type ApprovalOutcome,
  type WorkflowStepKind,
} from '../../domain/workflow-graph';

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
  private readonly injector = inject(Injector);
  protected readonly kinds = addableStepKinds;
  protected readonly kindLabels: Record<WorkflowStepKind, string> = {
    start: 'Старт',
    task: 'Задача',
    approval: 'Согласование',
    finish: 'Финиш',
  };
  protected readonly outcomeLabels: Record<ApprovalOutcome, string> = {
    approved: 'Согласовано',
    rejected: 'Отклонено',
  };
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

  protected addStep(value: string, input: HTMLInputElement, flow: FFlowComponent): void {
    const kind = this.kinds.find((item) => item === value);
    if (!kind) return;
    const bounds = this.surface().nativeElement.getBoundingClientRect();
    const id = this.graph.addStep(
      kind,
      input.value,
      flow.getPositionInFlow({ x: bounds.left + 16, y: bounds.top + 16 }),
    );
    if (!id) return;

    // Outcome rows and wrapped titles change the card height. Place it using its rendered size.
    afterNextRender(
      () => {
        const surface = this.surface().nativeElement;
        const cards = Array.from(surface.querySelectorAll<HTMLElement>('.step'));
        const added = cards.find((card) => card.dataset['stepId'] === id);
        if (!added) return;
        const others = cards
          .filter((card) => card !== added)
          .map((card) => card.getBoundingClientRect());
        const point = this.nextStepPosition(
          surface.getBoundingClientRect(),
          added.getBoundingClientRect(),
          others,
        );
        this.graph.moveNodes([{ id, position: flow.getPositionInFlow(point) }]);
      },
      { injector: this.injector },
    );

    input.value = '';
    input.focus();
  }

  private nextStepPosition(bounds: DOMRect, added: DOMRect, cards: readonly DOMRect[]) {
    const gap = 16;
    const { width, height } = added;
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
