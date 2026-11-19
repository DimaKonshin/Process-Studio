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
  viewChildren,
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

import { captureRoute, nearestRouteSite, routeSites } from '../../domain/route-sites';
import { ConnectionPropertiesComponent } from '../connection-properties/connection-properties.component';
import { CanvasControlsComponent, zoomLimits } from '../canvas-controls/canvas-controls.component';
import { StepPropertiesComponent } from '../step-properties/step-properties.component';
import { ConnectionRouteDirective } from './connection-route.directive';
import { WaypointHandlesPipe } from './waypoint-handles.pipe';

@Component({
  selector: 'wf-workflow-designer',
  imports: [
    FFlowModule,
    StepPropertiesComponent,
    CanvasControlsComponent,
    ConnectionPropertiesComponent,
    WaypointHandlesPipe,
    ConnectionRouteDirective,
  ],
  host: { '(document:keydown.escape)': 'expanded.set(false)' },
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

  private readonly renderedEdges = viewChildren(ConnectionRouteDirective);
  private readonly selectedRoute = computed(() =>
    this.renderedEdges().find((item) => item.edge()?.id === this.selectedConnectionId()),
  );
  protected readonly selectedEdge = computed(() =>
    this.graph.connections().find((edge) => edge.id === this.selectedConnectionId()),
  );
  protected readonly endpoints = computed(() => {
    const edge = this.selectedEdge();
    if (!edge) return;
    const source = this.graph
      .nodes()
      .find((node) => node.outputs.some((port) => port.id === edge.sourceId));
    const target = this.graph.nodes().find((node) => node.inputId === edge.targetId);
    const outcome = source?.outputs.find((port) => port.id === edge.sourceId)?.outcome;
    return {
      source: outcome
        ? `${source?.title} · ${this.outcomeLabels[outcome]}`
        : (source?.title ?? edge.sourceId),
      target: target?.title ?? edge.targetId,
    };
  });
  protected readonly sites = computed(() => {
    const route = this.selectedRoute();
    return route ? routeSites(route.vertices(), route.edge()?.waypoints ?? []) : [];
  });
  protected readonly choice = linkedSignal<string | null, number | null>({
    source: this.selectedConnectionId,
    computation: () => null,
  });
  protected readonly showSites = linkedSignal({
    source: this.selectedConnectionId,
    computation: () => false,
  });
  protected readonly pointIndex = linkedSignal<string | null, number | null>({
    source: this.selectedConnectionId,
    computation: () => null,
  });
  protected readonly activePoint = computed(
    () => this.selectedRoute()?.handles()[this.pointIndex() ?? -1],
  );
  protected choosePoint(index: number): void {
    this.pointIndex.set(index);
    this.choice.set(null);
    this.showSites.set(false);
  }
  protected chooseIndex(index: number): void {
    this.pointIndex.set(null);
    this.choice.set(index);
    this.showSites.set(false);
  }
  protected readonly siteIndex = computed(() => {
    const sites = this.sites();
    const picked = this.choice();
    if (picked !== null) return sites[picked] ? picked : -1;
    if (this.selectedEdge()?.waypoints?.length) return -1;
    // For keyboard selection, start at the midpoint of the longest leg.
    let longest = 0;
    let index = -1;
    for (const [i, site] of sites.entries()) {
      const length = Math.hypot(site.to.x - site.from.x, site.to.y - site.from.y);
      if (length > longest) {
        longest = length;
        index = i;
      }
    }
    return index;
  });
  protected readonly preview = computed(() => this.sites()[this.siteIndex()]);
  protected readonly dragExistingPoint = (event: Event): boolean =>
    event.target instanceof Element && !!event.target.closest('.f-waypoint');

  protected chooseSite(event: MouseEvent, edgeId: string, flow: FFlowComponent): void {
    if (edgeId !== this.selectedConnectionId() || this.dragExistingPoint(event)) return;
    const position = flow.getPositionInFlow({ x: event.clientX, y: event.clientY });
    this.chooseIndex(nearestRouteSite(this.sites(), position, 8 / this.scale()));
  }

  protected addRoutePoint(): void {
    const edge = this.selectedEdge();
    const site = this.preview();
    this.showSites.set(false);
    if (!edge || !site) return;
    const points = [...(edge.waypoints ?? [])];
    points.splice(site.insertAt, 0, site.position);
    this.choice.set(null);
    const route = captureRoute(this.selectedRoute()!.vertices(), points);
    this.graph.setWaypoints(edge.id, points, route);
    this.choosePoint(site.insertAt);
  }

  protected updateRoutePoints(id: string, points: { x: number; y: number }[]): void {
    this.choice.set(null);
    this.showSites.set(false);
    const renderer = this.renderedEdges().find((item) => item.edge()?.id === id);
    if (!renderer) return;
    if (points.length !== renderer.edge()?.waypoints?.length) this.pointIndex.set(null);
    const edit = renderer.finish(points);
    this.graph.setWaypoints(id, edit.points, edit.route);
  }

  protected removePoint(): void {
    const edge = this.selectedEdge(),
      index = this.pointIndex();
    if (!edge?.waypoints || index === null || !edge.waypoints[index]) return;
    const points = edge.waypoints.filter((_, i) => i !== index);
    this.updateRoutePoints(edge.id, points);
  }

  protected deleteSelection(flow: FFlowComponent): void {
    if (this.pointIndex() !== null) this.removePoint();
    else this.removeSelectedConnection(flow);
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
    this.selectedConnectionId.set(null);
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
