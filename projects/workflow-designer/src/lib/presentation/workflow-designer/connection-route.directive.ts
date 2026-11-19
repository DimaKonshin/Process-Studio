import { Directive, inject, input, output, signal } from '@angular/core';
import {
  CalculateSegmentLineData,
  ConnectionLineBuilder,
  createSegmentLinePath,
  F_CONNECTION_BUILDERS,
  type IFConnectionBuilderRequest,
  type IFConnectionBuilderResponse,
} from '@foblex/flow';

import { constrainHandles, editablePolyline } from '../../domain/editable-route';
import { captureRoute, singleSegmentFrame } from '../../domain/route-sites';
import type {
  RouteVertex,
  WorkflowConnection,
  WorkflowPosition,
} from '../../domain/workflow-graph';

@Directive({
  selector: 'f-connection[wfRoute]',
  providers: [
    ConnectionLineBuilder,
    {
      provide: F_CONNECTION_BUILDERS,
      useFactory: () => ({ 'workflow-route': inject(ConnectionRouteDirective) }),
    },
  ],
  host: { '(pointerdown)': 'beginDrag($event)' },
})
export class ConnectionRouteDirective {
  readonly edge = input<WorkflowConnection>(undefined, { alias: 'wfRoute' });
  readonly vertices = signal<readonly WorkflowPosition[]>([]);
  readonly handles = signal<readonly WorkflowPosition[]>([]);
  readonly selectHandle = output<number>();
  private readonly automatic = new CalculateSegmentLineData();
  private dragRoute?: readonly RouteVertex[];
  private request?: IFConnectionBuilderRequest;
  private savedFrame?: readonly RouteVertex[];
  private displayFrame?: readonly RouteVertex[];

  beginDrag(event: PointerEvent): void {
    if (!(event.target instanceof Element && event.target.closest('.f-waypoint'))) return;
    const circle = event.target.closest('.f-waypoint')!;
    const host = circle.closest('f-connection-waypoints');
    if (!host) return;
    const index = Array.from(host.querySelectorAll('.f-waypoint')).indexOf(circle);
    if (index >= 0 && event.button === 0) this.selectHandle.emit(index);
    const edge = this.edge();
    if (!edge) return;
    this.dragRoute = this.displayFrame ?? captureRoute(this.vertices(), edge.waypoints ?? []);
  }

  handle(request: IFConnectionBuilderRequest): IFConnectionBuilderResponse {
    this.request = request;
    const edge = this.edge();
    const saved = edge?.route;
    if (saved !== this.savedFrame) {
      this.savedFrame = saved;
      this.displayFrame = saved;
      // Older saves can contain a detour belonging to a deleted control.
      if (saved && edge?.waypoints?.length === 1) {
        const bare = this.automatic.handle({
          ...request,
          source: saved[0],
          target: saved[saved.length - 1],
          waypoints: [],
        }).points;
        if (saved.length > bare.length + 1) {
          this.displayFrame = singleSegmentFrame(bare, saved, 0, edge.waypoints[0]) ?? saved;
        }
      }
    }
    const frame = this.dragRoute ?? this.displayFrame;
    let geometry: IFConnectionBuilderResponse;
    if (
      frame &&
      frame.length >= 2 &&
      request.waypoints.length === frame.filter((v) => v.control).length
    ) {
      const handles = constrainHandles(frame, request.waypoints, request.source, request.target);
      const points = editablePolyline(frame, handles, request.source, request.target);
      if (points.length < 2) points.push(request.target);
      geometry = {
        points,
        path: createSegmentLinePath(points, 0),
        secondPoint: points[1],
        penultimatePoint: points[points.length - 2],
        waypointHandles: handles,
        candidates: [],
      };
    } else {
      geometry = this.automatic.handle(request);
      geometry.candidates = [];
    }
    this.vertices.set(geometry.points);
    this.handles.set(geometry.waypointHandles ?? request.waypoints);
    return geometry;
  }

  finish(points: readonly WorkflowPosition[]): {
    points: readonly WorkflowPosition[];
    route?: readonly RouteVertex[];
  } {
    const edge = this.edge(),
      frame = this.dragRoute ?? this.displayFrame;
    this.dragRoute = undefined;
    const request = this.request;
    if (!edge || !points.length || !request) return { points };
    const previous = edge.waypoints ?? [];
    if (points.length < previous.length) {
      // Rebuild from live ports and surviving controls. Retaining an unmarked
      // vertex here would pin the old bend in place during the next drag.
      if (frame && points.length === 1) {
        const kept = previous.findIndex((p) => p.x === points[0].x && p.y === points[0].y);
        const bare = this.automatic.handle({ ...request, waypoints: [] }).points;
        const route = singleSegmentFrame(bare, frame, kept, points[0]);
        if (route) return { points, route };
      }
      const raw = this.automatic.handle({ ...request, waypoints: [...points] }).points;
      const route = captureRoute(raw, points);
      return {
        points,
        route: route.filter((v) => v.control).length === points.length ? route : undefined,
      };
    }
    if (!frame) return { points };
    return {
      points: constrainHandles(frame, points, request.source, request.target),
      route: frame,
    };
  }
}
