import { NgModule } from '@angular/core';
import { RouterModule, type Routes } from '@angular/router';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'workflow' },
  {
    path: 'workflow',
    loadChildren: () =>
      import('./lazy-modules/workflow/workflow.module').then((module) => module.WorkflowModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
