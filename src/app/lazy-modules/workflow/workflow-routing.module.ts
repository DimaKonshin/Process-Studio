import { NgModule } from '@angular/core';
import { RouterModule, type Routes } from '@angular/router';

import { WorkflowLayoutComponent } from './presentation/layout/layout.component';
import { WorkflowEditorPageComponent } from './presentation/pages/editor/editor-page.component';

const routes: Routes = [
  {
    path: '',
    component: WorkflowLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'editor' },
      {
        path: 'editor',
        title: 'Редактор процессов · Process Studio',
        component: WorkflowEditorPageComponent,
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class WorkflowRoutingModule {}
