import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { App } from './app';
import { AppModule } from './app.module';

describe('Workflow editor routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [AppModule] });
  });

  it.each(['/', '/workflow', '/workflow/editor'])('opens the editor from %s', async (url) => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();

    expect(router.url).toBe('/workflow/editor');
    const layout = fixture.nativeElement.querySelector('app-workflow-layout');
    expect(layout?.querySelector('h1')?.textContent).toBe('Редактор процессов');
    expect(layout?.querySelector('wf-workflow-designer')).toBeTruthy();
  });
});
