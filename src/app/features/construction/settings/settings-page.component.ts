import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { LoadingSpinnerComponent } from '../../../shared/components/loading/loading-spinner.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { SettingsRepository } from '../repositories/construction.repository';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { TranslateService } from '../../../core/services/translate.service';
import { SystemUser } from '../models/construction.models';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe, LoadingSpinnerComponent, ModalComponent],
  template: `
    <app-loading-spinner [show]="loading()" />
    <div class="space-y-6">
      <div class="page-header"><h2 class="page-title">{{ 'SETTINGS.TITLE' | t }}</h2></div>

      <!-- Current user -->
      <div class="card">
        <h3 class="font-semibold text-slate-800 mb-4">{{ 'SETTINGS.CURRENT_USER' | t }}</h3>
        @if (auth.user()) {
          <div class="grid md:grid-cols-2 gap-4 text-sm">
            <div><span class="text-slate-500">{{ 'COMMON.NAME' | t }}:</span> <strong>{{ auth.displayName(translate.currentLang()) }}</strong></div>
            <div><span class="text-slate-500">{{ 'SETTINGS.EMAIL' | t }}:</span> <strong>{{ auth.user()!.email }}</strong></div>
            <div><span class="text-slate-500">{{ 'SETTINGS.ROLE' | t }}:</span> <strong>{{ auth.user()!.role }}</strong></div>
            <div>
              <span class="text-slate-500">{{ 'SETTINGS.VERIFIED' | t }}:</span>
              <span class="badge ms-2">{{ auth.user()!.is_verified ? ('SETTINGS.VERIFIED_YES' | t) : ('SETTINGS.VERIFIED_NO' | t) }}</span>
            </div>
          </div>
        }
      </div>

      <!-- System users (max 4) -->
      <div class="card">
        <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
          <h3 class="font-semibold text-slate-800">{{ 'SETTINGS.SYSTEM_USERS' | t }}</h3>
          <button type="button" class="btn-primary" (click)="openUserModal()" [disabled]="users().length >= maxUsers">{{ 'SETTINGS.ADD_USER' | t }} ({{ users().length }}/{{ maxUsers }})</button>
        </div>
        <p class="text-sm text-slate-500 mb-4">{{ 'SETTINGS.USERS_HINT' | t }}</p>
        <table class="data-table">
          <thead><tr><th>{{ 'SETTINGS.EMAIL' | t }}</th><th>{{ 'COMMON.NAME' | t }}</th><th>{{ 'SETTINGS.ROLE' | t }}</th><th>{{ 'COMMON.ACTIONS' | t }}</th></tr></thead>
          <tbody>
            @for (u of users(); track u.id) {
              <tr>
                <td>{{ u.email }}</td>
                <td>{{ translate.currentLang() === 'ar' ? u.name_ar : u.name_en }}</td>
                <td>{{ roleLabel(u.role) }}</td>
                <td class="flex gap-1">
                  <button type="button" class="btn-secondary !py-1 !px-2" (click)="openEditUser(u)">{{ 'COMMON.EDIT' | t }}</button>
                  <button type="button" class="btn-danger !py-1 !px-2" (click)="deleteUser(u.id)">{{ 'COMMON.DELETE' | t }}</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="4" class="text-center py-6 text-slate-400">{{ 'COMMON.NO_DATA' | t }}</td></tr> }
          </tbody>
        </table>
      </div>

      <!-- General settings -->
      <div class="card max-w-xl space-y-4">
        <h3 class="font-semibold text-slate-800">{{ 'SETTINGS.GENERAL' | t }}</h3>
        @for (s of settings(); track s.key) {
          <div class="form-field">
            <label class="form-label">{{ translate.currentLang() === 'ar' ? s.label_ar : s.label_en }}</label>
            <input class="input" [ngModel]="formatValue(s.value)" (ngModelChange)="draft[s.key] = $event" />
          </div>
        }
        @if (settings().length) {
          <button type="button" class="btn-primary" (click)="saveAll()">{{ 'COMMON.SAVE' | t }}</button>
        }
      </div>
    </div>

    <app-modal [open]="userModal()" [title]="editUserId ? ('SETTINGS.EDIT_USER' | t) : ('SETTINGS.ADD_USER' | t)" (close)="userModal.set(false)">
      <div class="grid gap-4">
        <div class="form-field"><label class="form-label">{{ 'SETTINGS.EMAIL' | t }}</label><input class="input" type="email" [(ngModel)]="userForm.email" [disabled]="!!editUserId" /></div>
        <div class="form-field"><label class="form-label">{{ 'COMMON.NAME' | t }}</label><input class="input" [(ngModel)]="userForm.name_ar" /></div>
        <div class="form-field"><label class="form-label">{{ 'SETTINGS.PASSWORD' | t }}</label><input class="input" type="password" [(ngModel)]="userForm.password" [placeholder]="editUserId ? ('SETTINGS.PASSWORD_OPTIONAL' | t) : ''" /></div>
        <div class="form-field"><label class="form-label">{{ 'SETTINGS.ROLE' | t }}</label>
          <select class="input" [(ngModel)]="userForm.role">
            <option value="admin">{{ 'SETTINGS.ROLE_ADMIN' | t }}</option>
            <option value="user">{{ 'SETTINGS.ROLE_USER' | t }}</option>
            <option value="warehouse">{{ 'SETTINGS.ROLE_WAREHOUSE' | t }}</option>
          </select>
        </div>
      </div>
      <div modal-footer class="flex gap-2 justify-end w-full">
        <button type="button" class="btn-secondary" (click)="userModal.set(false)">{{ 'COMMON.CANCEL' | t }}</button>
        <button type="button" class="btn-primary" (click)="saveUser()">{{ 'COMMON.SAVE' | t }}</button>
      </div>
    </app-modal>
  `,
})
export class SettingsPageComponent implements OnInit {
  private repo = inject(SettingsRepository);
  auth = inject(AuthService);
  private toast = inject(ToastService);
  translate = inject(TranslateService);

  settings = signal<Array<{ key: string; value: unknown; label_ar: string; label_en: string }>>([]);
  users = signal<SystemUser[]>([]);
  loading = signal(false);
  userModal = signal(false);
  editUserId: string | null = null;
  maxUsers = 4;
  draft: Record<string, string> = {};
  userForm = { email: '', name_ar: '', name_en: '', password: '', role: 'user' };

  ngOnInit(): void { this.load(); }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [settingsRes, usersRes] = await Promise.all([
        this.repo.findAll(),
        this.repo.listUsers(),
      ]);
      this.settings.set(settingsRes.data as Array<{ key: string; value: unknown; label_ar: string; label_en: string }>);
      this.draft = {};
      this.settings().forEach((s) => { this.draft[s.key] = this.formatValue(s.value); });
      this.users.set(usersRes.data as SystemUser[]);
    } catch { this.toast.error(this.translate.instant('MESSAGES.LOAD_ERROR')); }
    finally { this.loading.set(false); }
  }

  formatValue(value: unknown): string {
    if (typeof value === 'object' && value !== null) {
      return Object.values(value as Record<string, unknown>).join(', ');
    }
    return String(value);
  }

  openUserModal(): void {
    this.editUserId = null;
    this.userForm = { email: '', name_ar: '', name_en: '', password: '', role: 'user' };
    this.userModal.set(true);
  }

  openEditUser(u: SystemUser): void {
    this.editUserId = u.id;
    this.userForm = { email: u.email, name_ar: u.name_ar, name_en: u.name_en, password: '', role: u.role || 'user' };
    this.userModal.set(true);
  }

  roleLabel(role: string): string {
    const map: Record<string, string> = {
      admin: this.translate.instant('SETTINGS.ROLE_ADMIN'),
      user: this.translate.instant('SETTINGS.ROLE_USER'),
      warehouse: this.translate.instant('SETTINGS.ROLE_WAREHOUSE'),
    };
    return map[role] ?? role;
  }

  async saveUser(): Promise<void> {
    if (!this.userForm.email || !this.userForm.name_ar) {
      this.toast.error(this.translate.instant('MESSAGES.NAME_REQUIRED'));
      return;
    }
    if (!this.editUserId && !this.userForm.password) {
      this.toast.error(this.translate.instant('SETTINGS.PASSWORD_REQUIRED'));
      return;
    }
    try {
      const body = { ...this.userForm, name_en: this.userForm.name_ar };
      if (this.editUserId) {
        const payload: Record<string, string> = { name_ar: body.name_ar, name_en: body.name_en, role: body.role };
        if (body.password) payload['password'] = body.password;
        await this.repo.updateUser(this.editUserId, payload);
      } else {
        await this.repo.createUser(body);
      }
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      this.userModal.set(false);
      await this.load();
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }

  async deleteUser(id: string): Promise<void> {
    if (!confirm(this.translate.instant('MESSAGES.DELETE_CONFIRM'))) return;
    try {
      await this.repo.deleteUser(id);
      this.toast.success(this.translate.instant('MESSAGES.DELETE_SUCCESS'));
      await this.load();
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
  }

  async saveAll(): Promise<void> {
    this.loading.set(true);
    try {
      for (const s of this.settings()) {
        const raw = this.draft[s.key];
        const parsed = s.key.includes('rate') ? { rate: parseFloat(raw) } : { value: raw };
        await this.repo.upsert({ ...s, value: parsed });
      }
      this.toast.success(this.translate.instant('MESSAGES.SAVE_SUCCESS'));
      await this.load();
    } catch { this.toast.error(this.translate.instant('MESSAGES.SAVE_ERROR')); }
    finally { this.loading.set(false); }
  }
}
