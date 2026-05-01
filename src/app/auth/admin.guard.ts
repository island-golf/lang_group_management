import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Check if user is logged in
  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  // Check if user is admin
  const currentUser = auth.currentUser();
  const adminUsernames = ['admin', 'administrator', 'superadmin'];

  if (currentUser && adminUsernames.includes(currentUser.USERNAME.toLowerCase())) {
    return true;
  }

  // If not admin, redirect to home or show access denied
  return router.createUrlTree(['/home']);
};
