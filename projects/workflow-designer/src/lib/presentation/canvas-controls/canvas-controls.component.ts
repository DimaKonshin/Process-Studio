import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export const zoomLimits = { min: 0.1, max: 4 } as const;

@Component({
  selector: 'wf-canvas-controls',
  templateUrl: './canvas-controls.component.html',
  styleUrl: './canvas-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasControlsComponent {
  readonly scale = input.required<number>();
  readonly expanded = input.required<boolean>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly toggleExpanded = output<void>();
  protected readonly percent = computed(() => Math.round(this.scale() * 100));
  protected readonly limits = zoomLimits;
}
