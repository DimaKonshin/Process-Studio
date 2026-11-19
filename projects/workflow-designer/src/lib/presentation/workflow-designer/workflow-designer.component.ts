import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import {
  FCanvasComponent,
  FFlowComponent,
  FFlowModule,
  FZoomDirective,
  type FSelectionChangeEvent,
  provideFFlow,
  withA11y,
} from '@foblex/flow';

import { WorkflowCanvasState } from '../../data-access/workflow-canvas-state';

import { type ApprovalOutcome, type WorkflowStepKind } from '../../domain/workflow-graph';

import { CanvasControlsComponent, zoomLimits } from '../canvas-controls/canvas-controls.component';
import { StepPropertiesComponent } from '../step-properties/step-properties.component';
import { WaypointHandlesPipe } from './waypoint-handles.pipe';

@Component({
  selector: 'wf-workflow-designer',
  imports: [FFlowModule, StepPropertiesComponent, CanvasControlsComponent, WaypointHandlesPipe],
  host: { '(document:keydown.escape)': 'onEscape()' },
  providers: [WorkflowCanvasState, provideFFlow(withA11y())],
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
  protected readonly zoom = viewChild.required(FZoomDirective);
  protected readonly limits = zoomLimits;
  protected readonly expanded = signal(false);
  protected readonly scale = signal(1);
  private viewportInitialized = false;
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
  private readonly selectedNodeId = signal<string | null>(null);
  protected readonly selectedStep = computed(() =>
    this.graph.nodes().find((node) => node.id === this.selectedNodeId()),
  );
  protected readonly selectedConnectionId = signal<string | null>(null);

  protected readonly placingPoints = linkedSignal({
    source: this.selectedConnectionId,
    computation: () => false,
  });

  protected onEscape(): void {
    if (this.placingPoints()) this.placingPoints.set(false);
    else this.expanded.set(false);
  }

  protected placeWaypoint(event: MouseEvent, flow: FFlowComponent): void {
    if (!this.placingPoints() || (event.target instanceof Element && event.target.closest('.step')))
      return;
    const edge = this.graph.connections().find((item) => item.id === this.selectedConnectionId());
    if (!edge) return;
    const point = flow.getPositionInFlow({ x: event.clientX, y: event.clientY });
    this.graph.setWaypoints(edge.id, [...(edge.waypoints ?? []), point]);
  }

  protected onSelectionChange({ nodeIds, groupIds, connectionIds }: FSelectionChangeEvent): void {
    const singleNode = nodeIds.length === 1 && !groupIds.length && !connectionIds.length;
    this.selectedNodeId.set(singleNode ? nodeIds[0] : null);
    const singleEdge = connectionIds.length === 1 && !nodeIds.length && !groupIds.length;
    this.selectedConnectionId.set(singleEdge ? connectionIds[0] : null);
  }

  protected removeSelectedConnection(flow: FFlowComponent): void {
    const id = this.selectedConnectionId();
    if (id === null) return;
    flow.clearSelection();
    this.selectedConnectionId.set(null);
    this.graph.removeConnection(id);
  }

  protected dismissProperties(flow: FFlowComponent): void {
    flow.clearSelection();
    this.selectedNodeId.set(null);
    this.surface().nativeElement.focus({ preventScroll: true });
  }

  protected removeSelectedStep(flow: FFlowComponent): void {
    const step = this.selectedStep();
    if (!step) return;
    this.dismissProperties(flow);
    this.graph.removeStep(step.id);
  }

  protected openCanvas(canvas: FCanvasComponent): void {
    if (this.viewportInitialized) return;
    this.viewportInitialized = true;
    const { clientWidth, clientHeight } = this.surface().nativeElement;
    const view = this.graph.initialViewport;
    // Closing the drawer or leaving expanded mode changes the canvas size on reload.
    const sameWindow =
      view?.windowSize?.width === window.innerWidth &&
      view.windowSize.height === window.innerHeight;
    const sameCanvas = view?.width === clientWidth && view.height === clientHeight;
    if (this.graph.nodes().length && !sameCanvas && !sameWindow) {
      canvas.fitToScreen({ x: 32, y: 32 }, false, true, 1);
    }
    this.scale.set(canvas.getScale());
  }

  protected addStep(value: string, input: HTMLInputElement, flow: FFlowComponent): void {
    const kind = this.graph.availableStepKinds().find((item) => item === value);
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
      windowSize: { width: window.innerWidth, height: window.innerHeight },
    });
  }
}
