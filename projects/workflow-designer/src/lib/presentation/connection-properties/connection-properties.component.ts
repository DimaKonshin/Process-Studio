import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { WorkflowPosition } from '../../domain/workflow-graph';
import type { RouteSite } from '../../domain/route-sites';

@Component({
  selector: 'wf-connection-properties',
  templateUrl: './connection-properties.component.html',
  styleUrl: './connection-properties.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionPropertiesComponent {
  readonly source = input.required<string>();
  readonly target = input.required<string>();
  readonly sites = input.required<readonly RouteSite[]>();
  readonly selectedIndex = input.required<number>();
  readonly showSites = input.required<boolean>();
  readonly toggleSites = output<void>();
  readonly points = input.required<readonly WorkflowPosition[]>();
  readonly pointIndex = input.required<number | null>();
  readonly choosePoint = output<number>();
  readonly removePoint = output<void>();
  readonly choose = output<number>();
  readonly add = output<void>();
  readonly remove = output<void>();
  readonly dismiss = output<void>();
  protected readonly labels = {
    horizontal: 'Середина горизонтали',
    vertical: 'Середина вертикали',
    corner: 'Поворот',
  };
}
