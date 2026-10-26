import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Estacion {
  id?: string;
  nombre: string;
  barrio: string;
  direccion: string;
  lat: number;
  lng: number;
  capacidad: number;
  activa: boolean;
  total_bicicletas: number;
  disponibles: number;
}

export interface EstacionDetalle extends Estacion {
  bicicletas: import('./bicicleta.service').Bicicleta[];
}

@Injectable({ providedIn: 'root' })
export class EstacionService {

  private readonly api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Estacion[]> {
    return this.http.get<Estacion[]>(`${this.api}/estaciones`);
  }

  getById(id: string): Observable<EstacionDetalle> {
    return this.http.get<EstacionDetalle>(`${this.api}/estacion/${id}`);
  }

  create(estacion: Omit<Estacion, 'id' | 'total_bicicletas' | 'disponibles'>): Observable<Estacion> {
    return this.http.post<Estacion>(`${this.api}/estacion`, estacion);
  }

  update(id: string, estacion: Partial<Estacion>): Observable<Estacion> {
    return this.http.put<Estacion>(`${this.api}/estacion/${id}`, estacion);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/estacion/${id}`);
  }
}
