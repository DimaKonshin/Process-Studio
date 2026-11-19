import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import type { WorkflowDefinition } from 'workflow-designer';

@Component({
  selector: 'app-workflow-editor-page',
  standalone: false,
  templateUrl: './editor-page.component.html',
  styleUrl: './editor-page.component.scss',
})
export class WorkflowEditorPageComponent {
  protected readonly process = toSignal(
    inject(ActivatedRoute).data.pipe(map((data) => data['process'] as WorkflowDefinition)),
    { requireSync: true },
  );
}
