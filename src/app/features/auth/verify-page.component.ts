import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AuthService, AuthApiError } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-verify-page',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-card__header">
          <h1 class="auth-card__title">{{ 'AUTH.VERIFY_TITLE' | t }}</h1>
          <p class="auth-card__subtitle">{{ 'AUTH.VERIFY_SUBTITLE' | t }}</p>
        </div>

        <form class="auth-form" (ngSubmit)="submit()">
          <label class="auth-label">
            <span>{{ 'AUTH.EMAIL' | t }}</span>
            <input class="input input-lg" type="email" [(ngModel)]="email" name="email" required />
          </label>

          <label class="auth-label">
            <span>{{ 'AUTH.VERIFY_CODE' | t }}</span>
            <input class="input input-lg" [(ngModel)]="code" name="code" maxlength="6" required autocomplete="one-time-code" />
          </label>

          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            {{ loading() ? ('APP.LOADING' | t) : ('AUTH.VERIFY' | t) }}
          </button>
        </form>

        <div class="auth-actions">
          <button type="button" class="btn-secondary w-full" [disabled]="resending()" (click)="resend()">
            {{ resending() ? ('APP.LOADING' | t) : ('AUTH.RESEND_CODE' | t) }}
          </button>
        </div>

        @if (devCode()) {
          <p class="auth-dev-code">{{ 'AUTH.DEV_CODE' | t }}: <strong>{{ devCode() }}</strong></p>
        }

        <p class="auth-footer">
          <a routerLink="/login">{{ 'AUTH.BACK_TO_LOGIN' | t }}</a>
        </p>
      </div>
    </div>
  `,
})
export class VerifyPageComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  translate = inject(TranslateService);

  email = '';
  code = '';
  loading = signal(false);
  resending = signal(false);
  devCode = signal('');

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  async submit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.auth.verify(this.email, this.code);
      this.toast.success(this.translate.instant('AUTH.VERIFY_SUCCESS'));
      await this.router.navigate(['/login'], { queryParams: { email: this.email } });
    } catch (err) {
      const error = err as AuthApiError;
      this.toast.error(error.message || this.translate.instant('AUTH.VERIFY_FAILED'));
    } finally {
      this.loading.set(false);
    }
  }

  async resend(): Promise<void> {
    if (!this.email) {
      this.toast.error(this.translate.instant('AUTH.EMAIL_REQUIRED'));
      return;
    }
    this.resending.set(true);
    try {
      const code = await this.auth.resendCode(this.email);
      if (code) this.devCode.set(code);
      this.toast.success(this.translate.instant('AUTH.RESEND_SUCCESS'));
    } catch (err) {
      const error = err as AuthApiError;
      this.toast.error(error.message || this.translate.instant('AUTH.RESEND_FAILED'));
    } finally {
      this.resending.set(false);
    }
  }
}
