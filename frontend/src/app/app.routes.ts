import { Routes } from '@angular/router';
import { roleGuard } from './shared/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'mapa', pathMatch: 'full' },
  {
    path: 'mapa',
    loadComponent: () => import('./mapa/mapa.component').then(m => m.MapaComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./registro/registro.component').then(m => m.RegistroComponent)
  },
  {
    path: 'admin',
    canActivate: [roleGuard(['admin'])],
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'tecnico',
    canActivate: [roleGuard(['tecnico'])],
    loadComponent: () => import('./tecnico/tecnico.component').then(m => m.TecnicoComponent)
  },
  {
    path: 'viajes',
    canActivate: [roleGuard(['cliente'])],
    loadComponent: () => import('./viajes/viajes.component').then(m => m.ViajesComponent)
  },
  {
    path: 'perfil',
    canActivate: [roleGuard(['cliente', 'admin', 'tecnico'])],
    loadComponent: () => import('./perfil/perfil.component').then(m => m.PerfilComponent)
  },
  { path: '**', redirectTo: 'mapa' }
];
