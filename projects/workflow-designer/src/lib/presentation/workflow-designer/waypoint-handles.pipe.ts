import { Pipe, type PipeTransform } from '@angular/core';

import type { WorkflowPosition } from '../../domain/workflow-graph';

@Pipe({ name: 'waypointHandles' })
export class WaypointHandlesPipe implements PipeTransform {
  transform(points: readonly WorkflowPosition[] | undefined): WorkflowPosition[] {
    // Foblex mutates its working array during a drag. Commit to the graph only on release.
    return points?.slice() ?? [];
  }
}
