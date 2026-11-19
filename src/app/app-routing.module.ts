import { NgModule } from '@angular/core';
import { RouterModule, type Routes } from '@angular/router';

import { StudioLayoutComponent } from './presentation/layout/studio-layout/studio-layout.component';

const routes: Routes = [
  {
    path: '',
    component: StudioLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Главная · Process Studio',
        loadComponent: () =>
          import('./lazy-modules/home/presentation/pages/home/home-page.component').then(
            (m) => m.HomePageComponent,
          ),
      },
      {
        path: 'workflow',
        loadChildren: () =>
          import('./lazy-modules/workflow/workflow.module').then((m) => m.WorkflowModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
