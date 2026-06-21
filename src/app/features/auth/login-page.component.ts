import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { AuthService, AuthApiError } from '../../core/services/auth.service';
import { TranslateService } from '../../core/services/translate.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-card__header">
          <h1 class="auth-card__title">{{ 'APP.TITLE' | t }}</h1>
          <p class="auth-card__subtitle">{{ 'AUTH.LOGIN_SUBTITLE' | t }}</p>
        </div>

        <form class="auth-form" (ngSubmit)="submit()">
          <label class="auth-label">
            <span>{{ 'AUTH.EMAIL' | t }}</span>
            <input class="input input-lg" type="email" [(ngModel)]="email" name="email" required autocomplete="username" />
          </label>

          <label class="auth-label">
            <span>{{ 'AUTH.PASSWORD' | t }}</span>
            <input class="input input-lg" type="password" [(ngModel)]="password" name="password" required autocomplete="current-password" />
          </label>

          <button type="submit" class="btn-primary w-full" [disabled]="loading()">
            {{ loading() ? ('APP.LOADING' | t) : ('AUTH.LOGIN' | t) }}
          </button>
        </form>

        <p class="auth-footer">
          {{ 'AUTH.NEED_VERIFY' | t }}
          <a routerLink="/verify" [queryParams]="{ email }">{{ 'AUTH.VERIFY_LINK' | t }}</a>
        </p>

        <div class="auth-lang">
          <button type="button" class="auth-lang-btn" [class.auth-lang-btn--active]="translate.currentLang() === 'ar'" (click)="translate.use('ar')">AR</button>
          <button type="button" class="auth-lang-btn" [class.auth-lang-btn--active]="translate.currentLang() === 'en'" (click)="translate.use('en')">EN</button>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  translate = inject(TranslateService);

  email = '';
  password = '';
  loading = signal(false);

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  async submit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.auth.loginLocal(this.email, this.password);
      await this.router.navigate(['/construction/dashboard']);
    } catch (err) {
      const error = err as AuthApiError;
      if (error.code === 'NEEDS_VERIFICATION') {
        await this.router.navigate(['/verify'], { queryParams: { email: this.email } });
        return;
      }
      if (error.code === 'MODULE_NOT_SUBSCRIBED') {
        this.toast.error(this.translate.instant('AUTH.MODULE_NOT_SUBSCRIBED'));
      } else {
        this.toast.error(error.message || this.translate.instant('AUTH.LOGIN_FAILED'));
      }
    } finally {
      this.loading.set(false);
    }
  }
}
