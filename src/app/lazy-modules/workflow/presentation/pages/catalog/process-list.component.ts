import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { WorkflowDefinition } from 'workflow-designer';

import { createProcess, deleteProcess, listProcesses } from '../../../data-access/process-catalog';
import { expenseApproval, leaveRequest } from '../../../domain/process-examples';

@Component({
  selector: 'app-process-list',
  imports: [RouterLink],
  templateUrl: './process-list.component.html',
  styleUrl: './process-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcessListComponent {
  private readonly router = inject(Router);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('createDialog');
  private readonly removeDialog = viewChild.required<ElementRef<HTMLDialogElement>>('removeDialog');
  private readonly createButton = viewChild.required<ElementRef<HTMLButtonElement>>('createButton');
  private readonly processLinks = viewChildren<ElementRef<HTMLAnchorElement>>('processLink');
  protected readonly pendingRemoval = signal<WorkflowDefinition | null>(null);
  protected readonly processes = signal(listProcesses());
  protected readonly examples = [expenseApproval.id, leaveRequest.id];
  protected readonly error = signal('');

  protected openDialog(input: HTMLInputElement): void {
    this.error.set('');
    input.value = '';
    this.dialog().nativeElement.showModal();
    input.focus();
  }

  protected askToRemove(process: WorkflowDefinition): void {
    this.error.set('');
    this.pendingRemoval.set(process);
    this.removeDialog().nativeElement.showModal();
  }

  protected remove(): void {
    const process = this.pendingRemoval();
    if (!process) return;
    try {
      deleteProcess(process.id);
    } catch {
      this.error.set('Не удалось удалить процесс. Проверьте доступ к хранилищу браузера.');
      return;
    }
    const links = this.processLinks();
    const index = this.processes().findIndex((item) => item.id === process.id);
    const nextFocus = links[index + 1] ?? links[index - 1] ?? this.createButton();
    this.removeDialog().nativeElement.close();
    this.processes.set(listProcesses());
    nextFocus.nativeElement.focus();
  }

  protected create(name: string): void {
    const title = name.trim();
    if (!title) {
      this.error.set('Введите название процесса.');
      return;
    }
    let id: string;
    try {
      id = createProcess(title).id;
    } catch {
      this.error.set('Не удалось создать процесс. Проверьте доступ к хранилищу браузера.');
      return;
    }
    this.processes.set(listProcesses());
    this.dialog().nativeElement.close();
    void this.router.navigate(['/workflow/editor', id]);
  }
}
