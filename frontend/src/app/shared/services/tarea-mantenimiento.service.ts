import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';

export type ZonaBicicleta = 'cadena' | 'rueda_trasera' | 'rueda_delantera' | 'manubrio' | 'frenos' | 'asiento';

export const ZONAS: { id: ZonaBicicleta; etiqueta: string }[] = [
  { id: 'cadena', etiqueta: 'Cadena' },
  { id: 'rueda_trasera', etiqueta: 'Rueda trasera' },
  { id: 'rueda_delantera', etiqueta: 'Rueda delantera' },
  { id: 'manubrio', etiqueta: 'Manubrio' },
  { id: 'frenos', etiqueta: 'Frenos' },
  { id: 'asiento', etiqueta: 'Asiento' }
];

export function etiquetaZona(id: string): string {
  return ZONAS.find(zona => zona.id === id)?.etiqueta ?? id;
}

export interface TareaMantenimiento {
  id?: string;
  zona: ZonaBicicleta;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class TareaMantenimientoService {
  private readonly api = `${API_BASE_URL}/tareas-mantenimiento`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TareaMantenimiento[]> {
    return this.http.get<TareaMantenimiento[]>(this.api);
  }

  create(tarea: Omit<TareaMantenimiento, 'id'>): Observable<TareaMantenimiento> {
    return this.http.post<TareaMantenimiento>(this.api, tarea);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}
