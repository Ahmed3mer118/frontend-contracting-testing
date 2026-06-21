import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectRepository {
  private api = inject(ApiService);

  findAll(params?: Record<string, string>) {
    return firstValueFrom(this.api.get<unknown[]>('/construction/projects', params));
  }

  create(body: unknown) {
    return firstValueFrom(this.api.post<unknown>('/construction/projects', body));
  }

  update(id: string, body: unknown) {
    return firstValueFrom(this.api.put<unknown>(`/construction/projects/${id}`, body));
  }

  delete(id: string) {
    return firstValueFrom(this.api.delete<unknown>(`/construction/projects/${id}`));
  }
}

@Injectable({ providedIn: 'root' })
export class DailyJournalRepository {
  private api = inject(ApiService);

  list<T>(projectId: string, segment: string, params?: Record<string, string>) {
    return firstValueFrom(this.api.get<T[]>(this.api.projectPath(projectId, segment), params));
  }

  create<T>(projectId: string, segment: string, body: unknown) {
    return firstValueFrom(this.api.post<T>(this.api.projectPath(projectId, segment), body));
  }

  update<T>(projectId: string, segment: string, id: string, body: unknown) {
    return firstValueFrom(this.api.put<T>(`${this.api.projectPath(projectId, segment)}/${id}`, body));
  }

  delete(projectId: string, segment: string, id: string) {
    return firstValueFrom(this.api.delete<unknown>(`${this.api.projectPath(projectId, segment)}/${id}`));
  }

  postSub<T>(projectId: string, segment: string, subPath: string, body: unknown) {
    return firstValueFrom(this.api.post<T>(`${this.api.projectPath(projectId, segment)}/${subPath}`, body));
  }

  getSub<T>(projectId: string, segment: string, subPath: string, params?: Record<string, string>) {
    return firstValueFrom(this.api.get<T>(`${this.api.projectPath(projectId, segment)}/${subPath}`, params));
  }

  putSub<T>(projectId: string, segment: string, subPath: string, body: unknown) {
    return firstValueFrom(this.api.put<T>(`${this.api.projectPath(projectId, segment)}/${subPath}`, body));
  }

  deleteSub(projectId: string, segment: string, subPath: string) {
    return firstValueFrom(this.api.delete<unknown>(`${this.api.projectPath(projectId, segment)}/${subPath}`));
  }
}

@Injectable({ providedIn: 'root' })
export class ReportRepository {
  private api = inject(ApiService);

  getProfitReport(projectId: string, params?: Record<string, string>) {
    return firstValueFrom(
      this.api.get<unknown>(`/construction/projects/${projectId}/reports/profit`, params)
    );
  }

  getFullReport(projectId: string, params?: Record<string, string>) {
    return firstValueFrom(
      this.api.get<unknown>(`/construction/projects/${projectId}/reports/full`, params)
    );
  }

  getDashboard(params?: Record<string, string>) {
    return firstValueFrom(this.api.get<unknown>('/construction/dashboard', params));
  }
}

@Injectable({ providedIn: 'root' })
export class SettingsRepository {
  private api = inject(ApiService);

  findAll(category?: string) {
    return firstValueFrom(
      this.api.get<unknown[]>('/construction/settings', category ? { category } : undefined)
    );
  }

  upsert(body: unknown) {
    return firstValueFrom(this.api.put<unknown>('/construction/settings', body));
  }

  listUsers() {
    return firstValueFrom(this.api.get<unknown[]>('/construction/settings/users'));
  }

  createUser(body: unknown) {
    return firstValueFrom(this.api.post<unknown>('/construction/settings/users', body));
  }

  updateUser(id: string, body: unknown) {
    return firstValueFrom(this.api.put<unknown>(`/construction/settings/users/${id}`, body));
  }

  deleteUser(id: string) {
    return firstValueFrom(this.api.delete<unknown>(`/construction/settings/users/${id}`));
  }
}

@Injectable({ providedIn: 'root' })
export class AuthRepository {
  private api = inject(ApiService);

  getProfile() {
    return firstValueFrom(this.api.get<unknown>('/construction/auth/me'));
  }

  login(email: string, password: string) {
    return firstValueFrom(this.api.post<{ token: string; user: unknown }>('/construction/auth/login', { email, password }));
  }
}
