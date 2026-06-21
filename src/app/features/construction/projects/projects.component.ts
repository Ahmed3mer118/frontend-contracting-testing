import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading/loading-spinner.component';
import { ProjectRepository } from '../repositories/construction.repository';
import { ProjectContextService } from '../../../core/services/project-context.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslateService } from '../../../core/services/translate.service';

interface Project {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  status: string;
  activity?: string;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ModalComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner [show]="loading()" />

    <div class="space-y-6">
      <div class="page-header">
        <h2 class="page-title">{{ 'PROJECTS.TITLE' | t }}</h2>
        <button type="button" class="btn-primary" (click)="openAdd()">{{ 'COMMON.ADD' | t }}</button>
      </div>

      <div class="filter-bar">
        <div class="form-field flex-1 min-w-[200px]">
          <label class="form-label">{{ 'COMMON.SEARCH' | t }}</label>
          <input class="input" [(ngModel)]="search" (ngModelChange)="onSearch()" [placeholder]="'PROJECTS.SEARCH_PLACEHOLDER' | t" />
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ 'PROJECTS.CODE' | t }}</th>
              <th>{{ 'PROJECTS.NAME' | t }}</th>
              <th>{{ 'PROJECTS.ACTIVITY' | t }}</th>
              <th>{{ 'PROJECTS.STATUS' | t }}</th>
              <th>{{ 'COMMON.ACTIONS' | t }}</th>
            </tr>
          </thead>
          <tbody>
            @for (p of filtered(); track p.id) {
              <tr>
                <td>{{ p.code }}</td>
                <td>{{ displayName(p) }}</td>
                <td>{{ p.activity || '—' }}</td>
                <td><span class="badge">{{ statusLabel(p.status) }}</span></td>
                <td>
                  <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEdit(p)">{{ 'COMMON.EDIT' | t }}</button>
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="text-center text-slate-400 py-8">{{ 'COMMON.NO_DATA' | t }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <app-modal [open]="modalOpen()" [title]="editId ? ('PROJECTS.EDIT_TITLE' | t) : ('PROJECTS.ADD_TITLE' | t)" (close)="closeModal()">
      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" (ngSubmit)="save()">
        <div class="form-field"><label class="form-label">{{ 'PROJECTS.CODE' | t }}</label><input class="input" [(ngModel)]="form.code" name="code" required /></div>
        <div class="form-field"><label class="form-label">{{ 'PROJECTS.NAME' | t }}</label><input class="input" [(ngModel)]="form.name" name="name" required /></div>
        <div class="form-field"><label class="form-label">{{ 'PROJECTS.ACTIVITY' | t }}</label><input class="input" [(ngModel)]="form.activity" name="activity" /></div>
        <div class="form-field">
          <label class="form-label">{{ 'PROJECTS.STATUS' | t }}</label>
          <select class="input" [(ngModel)]="form.status" name="status">
            <option value="active">{{ 'PROJECTS.ACTIVE' | t }}</option>
            <option value="completed">{{ 'PROJECTS.COMPLETED' | t }}</option>
            <option value="on_hold">{{ 'PROJECTS.ON_HOLD' | t }}</option>
            <option value="cancelled">{{ 'PROJECTS.CANCELLED' | t }}</option>
          </select>
        </div>
      </form>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="closeModal()">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="save()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>
  `,
})
export class ProjectsComponent implements OnInit {
  private repo = inject(ProjectRepository);
  private projectContext = inject(ProjectContextService);
  private toast = inject(ToastService);
  private translate = inject(TranslateService);

  projects = signal<Project[]>([]);
  search = '';
  loading = signal(false);
  modalOpen = signal(false);
  editId: string | null = null;
  form = { code: '', name: '', activity: '', status: 'active' };

  filtered = computed(() => {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.projects();
    return this.projects().filter(
      (p) => p.code.toLowerCase().includes(q) || p.name_ar.toLowerCase().includes(q) || p.name_en.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void { this.load(); }

  displayName(p: Project): string {
    return this.translate.currentLang() === 'ar' ? p.name_ar : p.name_en;
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = {
      active: 'PROJECTS.ACTIVE', completed: 'PROJECTS.COMPLETED', on_hold: 'PROJECTS.ON_HOLD', cancelled: 'PROJECTS.CANCELLED',
    };
    return this.translate.instant(map[s] || s);
  }

  onSearch(): void { /* client-side via computed */ }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await this.repo.findAll();
      this.projects.set(res.data as Project[]);
    } catch {
      this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR'));
    } finally {
      this.loading.set(false);
    }
  }

  openAdd(): void {
    this.editId = null;
    this.form = { code: '', name: '', activity: '', status: 'active' };
    this.modalOpen.set(true);
  }

  openEdit(p: Project): void {
    this.editId = p.id;
    this.form = { code: p.code, name: p.name_ar, activity: p.activity || '', status: p.status };
    this.modalOpen.set(true);
  }

  closeModal(): void { this.modalOpen.set(false); }

  async save(): Promise<void> {
    const body = {
      code: this.form.code,
      name_ar: this.form.name,
      name_en: this.form.name,
      activity: this.form.activity,
      status: this.form.status,
    };
    this.loading.set(true);
    try {
      if (this.editId) {
        await this.repo.update(this.editId, body);
      } else {
        await this.repo.create(body);
      }
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.closeModal();
      await this.load();
      await this.projectContext.loadProjects();
    } catch {
      this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR'));
    } finally {
      this.loading.set(false);
    }
  }
}
