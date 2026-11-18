import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';

import type { WorkflowNode } from '../../domain/workflow-graph';

@Component({
  selector: 'wf-step-properties',
  templateUrl: './step-properties.component.html',
  styleUrl: './step-properties.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StepPropertiesComponent {
  readonly step = input.required<WorkflowNode>();
  readonly kindLabel = input.required<string>();
  readonly rename = output<{ id: string; title: string }>();
  readonly remove = output<void>();
  readonly dismiss = output<void>();

  // A render of the same card can arrive while its next name is already being typed.
  protected readonly draftTitle = linkedSignal<WorkflowNode, string>({
    source: this.step,
    computation: (step, previous) =>
      step.id === previous?.source.id ? previous.value : step.title,
  });

  protected applyTitle(field: HTMLInputElement): void {
    const step = this.step();
    const title = field.value.trim();
    field.value = title || step.title;
    this.draftTitle.set(field.value);
    if (title) this.rename.emit({ id: step.id, title });
  }
}
