import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-studio-navigation',
  imports: [RouterLink, RouterLinkActive],
  host: { '[class.collapsed]': '!menuOpen()', '(keydown.escape)': 'closeMenu()' },
  templateUrl: './studio-navigation.component.html',
  styleUrl: './studio-navigation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioNavigationComponent {
  private readonly wideScreen = window.matchMedia?.('(min-width: 48rem)');
  protected readonly menuOpen = signal(this.wideScreen?.matches ?? true);
  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');

  constructor() {
    const onResize = (event: MediaQueryListEvent) => this.menuOpen.set(event.matches);
    this.wideScreen?.addEventListener('change', onResize);
    inject(DestroyRef).onDestroy(() => this.wideScreen?.removeEventListener('change', onResize));
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeMobileMenu());
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    if (this.wideScreen?.matches === false && this.menuOpen()) this.closeMenu();
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.menuButton().nativeElement.focus({ preventScroll: true });
  }
}
