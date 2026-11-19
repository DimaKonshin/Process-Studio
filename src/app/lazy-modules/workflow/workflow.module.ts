import { NgModule } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WorkflowDesignerComponent } from 'workflow-designer';

import { WorkflowLayoutComponent } from './presentation/layout/layout.component';
import { WorkflowEditorPageComponent } from './presentation/pages/editor/editor-page.component';
import { WorkflowRoutingModule } from './workflow-routing.module';

@NgModule({
  declarations: [WorkflowLayoutComponent, WorkflowEditorPageComponent],
  imports: [WorkflowRoutingModule, WorkflowDesignerComponent, RouterLink],
})
export class WorkflowModule {}
