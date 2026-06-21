import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/welcome/welcome-page.component').then((m) => m.WelcomePageComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'verify',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/verify-page.component').then((m) => m.VerifyPageComponent),
  },
  {
    path: 'construction',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/construction/construction.routes').then((m) => m.constructionRoutes),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
