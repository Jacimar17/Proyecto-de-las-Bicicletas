import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../api-config';

export type RolUsuario = 'cliente' | 'admin' | 'tecnico';

export interface LoginRequest {
  dni: string;
  password: string;
}

export interface RegistroRequest {
  dni: string;
  nombre: string;
  email: string;
  password: string;
}

export interface Usuario {
  id?: string;
  dni: string;
  nombre: string;
  email: string;
  bloqueado: boolean;
  role: RolUsuario;
  puntuacion?: number;
  suspendidoHasta?: string | null;
}

export interface LoginResponse {
  user: Usuario;
  token: string;
  role: RolUsuario;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly api = API_BASE_URL;

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.api}/usuario/login`, data);
  }

  loginGoogle(credential: string): Observable<LoginResponse> {
    return this.http.post<{ user: Usuario; token: string }>(`${this.api}/users/login/google`, { credential })
      .pipe(map(response => ({ user: response.user, token: response.token, role: response.user.role })));
  }

  registro(data: RegistroRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.api}/usuario/registro`, data);
  }

  getPerfil(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.api}/usuario/perfil`);
  }

  getAll(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.api}/usuario`);
  }

  create(data: RegistroRequest & { role: RolUsuario }): Observable<{ user: Usuario }> {
    return this.http.post<{ user: Usuario }>(`${this.api}/usuario`, data);
  }

  update(id: string, data: Partial<Usuario> & { password?: string }): Observable<{ user: Usuario }> {
    return this.http.put<{ user: Usuario }>(`${this.api}/usuario/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/usuario/${id}`);
  }

  guardarSesion(response: LoginResponse): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('bicicletas_token', response.token);
    localStorage.setItem('bicicletas_usuario', JSON.stringify(response.user));
  }

  get token(): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem('bicicletas_token');
  }

  get usuarioActual(): Usuario | null {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem('bicicletas_usuario');
    if (!value) return null;
    try {
      return JSON.parse(value) as Usuario;
    } catch {
      this.salir();
      return null;
    }
  }

  salir(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem('bicicletas_token');
    localStorage.removeItem('bicicletas_usuario');
  }
}
