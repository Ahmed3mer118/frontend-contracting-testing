import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.user()) {
    try {
      await auth.loadProfile();
    } catch {
      auth.logout();
      return router.createUrlTree(['/login']);
    }
  }

  return auth.user() ? true : router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.token()) return true;

  if (!auth.user()) {
    try {
      await auth.loadProfile();
    } catch {
      auth.logout();
      return true;
    }
  }

  return auth.user() ? router.createUrlTree(['/construction/dashboard']) : true;
};
