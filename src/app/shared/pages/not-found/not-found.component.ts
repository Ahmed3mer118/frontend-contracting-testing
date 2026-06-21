import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="not-found" [class.not-found--full]="fullPage">
      <div class="not-found__content">
        <p class="not-found__code">404</p>
        <h1 class="not-found__title">{{ 'NOT_FOUND.HEADING' | t }}</h1>
        <p class="not-found__message">{{ 'NOT_FOUND.MESSAGE' | t }}</p>
        @if (attemptedPath) {
          <p class="not-found__path">{{ attemptedPath }}</p>
        }
        <a routerLink="/construction/dashboard" class="not-found__btn">{{ 'NOT_FOUND.GO_HOME' | t }}</a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {
  private readonly router = inject(Router);

  /** Full-screen layout for top-level unknown routes. */
  fullPage = !this.router.url.startsWith('/construction');

  attemptedPath = this.router.url;
}
