import { Injectable, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { TranslateService } from './translate.service';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  isModuleAdmin: boolean;
  name_ar?: string;
  name_en?: string;
  is_verified?: boolean;
  source?: string;
  companyId?: string;
  companyName?: string;
  company?: { id: string; name: string; slug: string };
  modules?: string[];
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number
  ) {
    super(message);
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private translate = inject(TranslateService);

  readonly user = signal<AuthUser | null>(null);
  readonly token = signal<string | null>(localStorage.getItem('auth_token'));
  readonly isAuthenticated = computed(() => !!this.token() && !!this.user());

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
    this.token.set(token);
  }

  setUser(user: AuthUser): void {
    this.user.set(user);
  }

  async loadProfile(): Promise<void> {
    if (!this.token()) {
      this.user.set(null);
      return;
    }

    const res = await firstValueFrom(this.api.get<AuthUser>('/construction/auth/me'));
    this.user.set(res.data);
  }

  async loginLocal(email: string, password: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.api.post<{ token: string; user: AuthUser }>('/construction/auth/login', { email, password })
      );
      this.setToken(res.data.token);
      this.setUser(res.data.user);
    } catch (err) {
      throw this.toAuthError(err);
    }
  }

  async loginSystem(email: string, password: string, companySlug: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.api.post<{ token: string; refreshToken?: string; user: AuthUser }>(
          '/construction/auth/system/login',
          { email, password, companySlug }
        )
      );
      this.setToken(res.data.token);
      if (res.data.refreshToken) {
        localStorage.setItem('refresh_token', res.data.refreshToken);
      }
      this.setUser(res.data.user);
    } catch (err) {
      throw this.toAuthError(err);
    }
  }

  async verify(email: string, code: string): Promise<void> {
    try {
      await firstValueFrom(
        this.api.post('/construction/auth/verify', { email, code })
      );
    } catch (err) {
      throw this.toAuthError(err);
    }
  }

  async resendCode(email: string): Promise<string | undefined> {
    try {
      const res = await firstValueFrom(
        this.api.post<{ email: string; verification_code?: string }>(
          '/construction/auth/resend-code',
          { email }
        )
      );
      return res.data.verification_code;
    } catch (err) {
      throw this.toAuthError(err);
    }
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }

  displayName(lang: 'ar' | 'en' = 'ar'): string {
    const u = this.user();
    if (!u) return '';
    return lang === 'ar' ? (u.name_ar || u.email) : (u.name_en || u.name_ar || u.email);
  }

  systemTitle(): string {
    const u = this.user();
    const company = u?.company?.name || u?.companyName;
    if (company) return company;
    return this.translate.instant('APP.TITLE');
  }

  companySubtitle(): string {
    const u = this.user();
    const company = u?.company?.name || u?.companyName;
    if (company) return this.translate.instant('APP.MODULE_SUBTITLE');
    return '';
  }

  isWarehouseRole(): boolean {
    return this.user()?.role === 'warehouse';
  }

  canManageCategories(): boolean {
    const u = this.user();
    if (!u) return false;
    return u.isModuleAdmin || u.role === 'admin' || u.role === 'warehouse';
  }

  hasPermission(permission: string): boolean {
    const u = this.user();
    if (!u) return false;
    return u.isModuleAdmin || u.role === 'admin' || u.permissions.includes(permission);
  }

  private toAuthError(err: unknown): AuthApiError {
    if (err instanceof HttpErrorResponse) {
      const code = err.error?.error?.code as string | undefined;
      const message = err.error?.error?.message || err.message || 'Request failed';
      return new AuthApiError(message, code, err.status);
    }
    return new AuthApiError('Request failed');
  }
}
