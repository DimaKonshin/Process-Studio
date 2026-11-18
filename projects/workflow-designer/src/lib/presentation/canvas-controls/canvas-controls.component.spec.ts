import { TestBed } from '@angular/core/testing';
import { CanvasControlsComponent, zoomLimits } from './canvas-controls.component';

describe('CanvasControlsComponent', () => {
  it('reflects the canvas scale, zoom limits and expanded mode', () => {
    const fixture = TestBed.createComponent(CanvasControlsComponent);
    fixture.componentRef.setInput('scale', zoomLimits.min);
    fixture.componentRef.setInput('expanded', false);
    fixture.detectChanges();
    const [minus, plus, expand] = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    const onZoom = vi.fn();
    const onToggle = vi.fn();
    fixture.componentInstance.zoomIn.subscribe(onZoom);
    fixture.componentInstance.toggleExpanded.subscribe(onToggle);
    expect(minus.disabled).toBe(true);
    plus.click();
    expand.click();
    expect(onZoom).toHaveBeenCalledOnce();
    expect(onToggle).toHaveBeenCalledOnce();
    fixture.componentRef.setInput('scale', zoomLimits.max);
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();
    expect(plus.disabled).toBe(true);
    expect(minus.disabled).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('400%');
    expect(expand.getAttribute('aria-pressed')).toBe('true');
  });
});
