import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TareaMantenimiento, ZonaBicicleta } from './tarea-mantenimiento.service';

export interface PuntoMantenimiento {
  id: string;
  zona: ZonaBicicleta;
  nombre: string;
  x: number;
  y: number;
  tareas?: TareaMantenimiento[];
}

@Injectable({ providedIn: 'root' })
export class PuntoMantenimientoService {
  private readonly api = 'http://localhost:3000/api/mantenimiento/puntos';

  constructor(private http: HttpClient) {}

  getAll(): Observable<PuntoMantenimiento[]> {
    return this.http.get<PuntoMantenimiento[]>(this.api);
  }

  updatePosiciones(puntos: { id: string; x: number; y: number }[]): Observable<{ actualizados: number }> {
    return this.http.put<{ actualizados: number }>(this.api, { puntos });
  }

  create(punto: { zona: ZonaBicicleta; nombre: string; x: number; y: number }): Observable<PuntoMantenimiento> {
    return this.http.post<PuntoMantenimiento>(this.api, punto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
