import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';
import { firstValueFrom } from 'rxjs';

export interface Project {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  status: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectContextService {
  readonly projects = signal<Project[]>([]);
  readonly selectedProject = signal<Project | null>(null);
  private loadPromise: Promise<void> | null = null;

  constructor(private api: ApiService) {}

  async loadProjects(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.fetchProjects();
    return this.loadPromise;
  }

  private async fetchProjects(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.get<Project[]>('/construction/projects'));
      this.projects.set(res.data);
      if (res.data.length) {
        this.selectedProject.set(res.data[0]);
      }
    } catch {
      this.projects.set([]);
      this.selectedProject.set(null);
    }
  }

  selectProject(project: Project): void {
    this.selectedProject.set(project);
  }

  async ensureReady(): Promise<string | null> {
    if (!this.selectedProject()) await this.loadProjects();
    return this.getProjectId();
  }

  getProjectId(): string | null {
    return this.selectedProject()?.id ?? null;
  }
}
