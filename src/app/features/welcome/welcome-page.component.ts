import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslateService } from '../../core/services/translate.service';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="welcome-page">
      <div class="welcome-card">
        <div class="welcome-logo" aria-hidden="true">
          <svg viewBox="0 0 64 64" class="welcome-logo__svg">
            <rect x="8" y="24" width="48" height="32" rx="4" fill="#0d9488"/>
            <rect x="16" y="12" width="32" height="16" rx="2" fill="#14b8a6"/>
            <rect x="28" y="36" width="8" height="20" fill="#fff"/>
          </svg>
        </div>
        <h1 class="welcome-title">{{ 'APP.TITLE' | t }}</h1>
        <p class="welcome-subtitle">{{ 'WELCOME.SUBTITLE' | t }}</p>
        <a routerLink="/login" class="welcome-start">{{ 'WELCOME.START' | t }}</a>
        <div class="auth-lang mt-8">
          <button type="button" class="auth-lang-btn" [class.auth-lang-btn--active]="translate.currentLang() === 'ar'" (click)="translate.use('ar')">AR</button>
          <button type="button" class="auth-lang-btn" [class.auth-lang-btn--active]="translate.currentLang() === 'en'" (click)="translate.use('en')">EN</button>
        </div>
      </div>
    </div>
  `,
})
export class WelcomePageComponent {
  translate = inject(TranslateService);
}
