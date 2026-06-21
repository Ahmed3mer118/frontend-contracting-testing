import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectContextService, Project } from '../../../core/services/project-context.service';
import { TranslateService } from '../../../core/services/translate.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-project-selector',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="flex items-center gap-2">
      <label class="text-sm font-medium text-gray-700">{{ 'COMMON.PROJECT' | t }}:</label>
      <select
        class="input min-w-[200px]"
        [ngModel]="projectContext.selectedProject()?.id"
        (ngModelChange)="onChange($event)"
      >
        @for (p of projectContext.projects(); track p.id) {
          <option [value]="p.id">{{ projectName(p) }}</option>
        }
      </select>
    </div>
  `,
})
export class ProjectSelectorComponent implements OnInit {
  projectContext = inject(ProjectContextService);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    this.projectContext.loadProjects();
  }

  projectName(p: Project): string {
    return this.translate.currentLang() === 'ar' ? p.name_ar : p.name_en;
  }

  onChange(id: string): void {
    const project = this.projectContext.projects().find((p) => p.id === id);
    if (project) this.projectContext.selectProject(project);
  }
}
