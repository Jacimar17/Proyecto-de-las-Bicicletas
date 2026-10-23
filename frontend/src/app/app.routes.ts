import { Routes } from '@angular/router';

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
    loadComponent: () => import('./admin/admin.component').then(m => m.AdminComponent)
  },
  { path: '**', redirectTo: 'mapa' }
];
