import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { WorkflowDesignerComponent } from 'workflow-designer';

import { App } from './app';
import { AppModule } from './app.module';

describe('Workflow editor routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AppModule] }).overrideComponent(
      WorkflowDesignerComponent,
      { set: { template: '<ng-content />', imports: [] } },
    );
  });

  it.each(['/workflow', '/workflow/editor'])('opens the editor from %s', async (url) => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();

    expect(router.url).toBe('/workflow/editor');
    const layout = fixture.nativeElement.querySelector('app-workflow-layout');
    expect(layout?.querySelector('h1')?.textContent).toBe('Редактор процессов');
    expect(layout?.querySelector('wf-workflow-designer')).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('nav [aria-current="page"]')?.textContent.trim(),
    ).toBe('Редактор процессов');
  });

  it('navigates between home and the editor inside the same layout', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await fixture.whenStable();
    const root: HTMLElement = fixture.nativeElement;
    const header = root.querySelector('header')!;
    expect(root.querySelector('main h1')?.textContent).toBe('Главная');
    expect(root.querySelector('nav [aria-current="page"]')?.textContent?.trim()).toBe('Главная');
    expect(root.querySelector('wf-workflow-designer')).toBeNull();
    root.querySelector<HTMLAnchorElement>('main a')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/workflow/editor');
    expect(root.querySelector('header')).toBe(header);
    header.querySelector('a')!.click();
    await fixture.whenStable();
    expect(router.url).toBe('/');
    expect(root.querySelector('footer')?.textContent).toContain('Process Studio');
  });
});
