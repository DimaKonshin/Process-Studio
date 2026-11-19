import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'header[appStudioHeader]',
  imports: [RouterLink],
  templateUrl: './studio-header.component.html',
  styleUrl: './studio-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioHeaderComponent {}
