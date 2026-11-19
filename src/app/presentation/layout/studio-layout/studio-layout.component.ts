import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { StudioFooterComponent } from '../../components/studio-footer/studio-footer.component';
import { StudioHeaderComponent } from '../../components/studio-header/studio-header.component';
import { StudioNavigationComponent } from '../../components/studio-navigation/studio-navigation.component';

@Component({
  selector: 'app-studio-layout',
  imports: [RouterOutlet, StudioHeaderComponent, StudioNavigationComponent, StudioFooterComponent],
  templateUrl: './studio-layout.component.html',
  styleUrl: './studio-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioLayoutComponent {}
