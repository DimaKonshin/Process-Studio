import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'footer[appStudioFooter]',
  templateUrl: './studio-footer.component.html',
  styleUrl: './studio-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioFooterComponent {
  protected readonly year = new Date().getFullYear();
}
