import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolUsuario, UsuarioService } from './services/usuario.service';

export function roleGuard(roles: RolUsuario[]): CanActivateFn {
  return () => {
    const usuario = inject(UsuarioService).usuarioActual;
    const router = inject(Router);
    if (!usuario) return router.createUrlTree(['/login']);
    return roles.includes(usuario.role) ? true : router.createUrlTree(['/mapa']);
  };
}
