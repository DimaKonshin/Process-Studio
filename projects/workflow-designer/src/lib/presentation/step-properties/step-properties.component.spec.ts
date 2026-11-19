import { TestBed } from '@angular/core/testing';

import { createWorkflowNode } from '../../domain/workflow-graph';
import { StepPropertiesComponent } from './step-properties.component';

describe('StepPropertiesComponent', () => {
  it('applies the visible name to the selected step and restores a blank field', () => {
    const fixture = TestBed.createComponent(StepPropertiesComponent);
    const step = createWorkflowNode('review', 'task', 'Проверить заявку', { x: 30, y: 80 });
    fixture.componentRef.setInput('step', step);
    fixture.componentRef.setInput('kindLabel', 'Задача');
    fixture.detectChanges();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const rename = vi.fn();
    fixture.componentInstance.rename.subscribe(rename);
    expect(field.value).toBe(step.title);
    field.value = '  ';
    field.dispatchEvent(new Event('change'));
    expect(field.value).toBe(step.title);
    expect(rename).not.toHaveBeenCalled();
    field.value = ' Проверить бюджет ';
    field.dispatchEvent(new Event('change'));
    expect(rename).toHaveBeenCalledWith({ id: 'review', title: 'Проверить бюджет' });
  });
  it('preserves a new draft when the preceding rename is rendered and switches to the next card', () => {
    const fixture = TestBed.createComponent(StepPropertiesComponent);
    const step = createWorkflowNode('review', 'task', 'Исходное название', { x: 30, y: 80 });
    fixture.componentRef.setInput('step', step);
    fixture.componentRef.setInput('kindLabel', 'Задача');
    fixture.detectChanges();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('input');
    const rename = vi.fn();
    fixture.componentInstance.rename.subscribe(rename);

    field.value = 'Следующая правка';
    field.dispatchEvent(new Event('input'));
    fixture.componentRef.setInput('step', { ...step, title: 'Предыдущая правка' });
    fixture.detectChanges();
    expect(field.value).toBe('Следующая правка');
    field.dispatchEvent(new Event('change'));
    expect(rename).toHaveBeenCalledWith({ id: step.id, title: 'Следующая правка' });

    fixture.componentRef.setInput('step', { ...step, id: 'other', title: 'Другой шаг' });
    fixture.detectChanges();
    expect(field.value).toBe('Другой шаг');
  });
});
