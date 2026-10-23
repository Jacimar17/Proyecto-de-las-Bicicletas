import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Estacion {
  id?: string;
  nombre: string;
  barrio: string;
  direccion: string;
  capacidad: number;
  activa: boolean;
  total_bicicletas: number;
  disponibles: number;
}

@Injectable({ providedIn: 'root' })
export class EstacionService {

  private readonly api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Estacion[]> {
    return this.http.get<Estacion[]>(`${this.api}/estaciones`);
  }
}
