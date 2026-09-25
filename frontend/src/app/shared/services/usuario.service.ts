import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {

  private readonly api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.api}/usuario/login`, data);
  }

  registro(data: RegistroRequest): Observable<Usuario> {
    return this.http.post<Usuario>(`${this.api}/usuario/registro`, data);
  }
}
