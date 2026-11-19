import { inject, NgModule } from '@angular/core';
import {
  RedirectCommand,
  Router,
  RouterModule,
  type ActivatedRouteSnapshot,
  type Routes,
} from '@angular/router';

import { WorkflowLayoutComponent } from './presentation/layout/layout.component';
import { WorkflowEditorPageComponent } from './presentation/pages/editor/editor-page.component';

import { findProcess } from './data-access/process-catalog';
import { ProcessListComponent } from './presentation/pages/catalog/process-list.component';

const routes: Routes = [
  {
    path: '',
    component: WorkflowLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'editor' },
      {
        path: 'editor',
        title: 'Редактор процессов · Process Studio',
        component: ProcessListComponent,
      },
      {
        path: 'editor/:id',
        title: 'Схема процесса · Process Studio',
        component: WorkflowEditorPageComponent,
        resolve: {
          process: (route: ActivatedRouteSnapshot) =>
            findProcess(route.paramMap.get('id')!) ??
            new RedirectCommand(inject(Router).parseUrl('/workflow/editor'), { replaceUrl: true }),
        },
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkflowRoutingModule {}
