import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../Services/auth.service';

export const authGuardGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() || authService.hasStoredSession()) {
    return true;
  } else {
    console.warn('Ruta protegida. Usuario no autenticado, redirigiendo a /login');
    return router.parseUrl('/login'); // Cambiá si tu ruta de login es distinta
  }
};
