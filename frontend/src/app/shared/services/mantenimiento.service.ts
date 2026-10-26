import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type EstadoMantenimiento = 'DISPONIBLE' | 'EN_MANTENIMIENTO';

export interface Mantenimiento {
  id?: string;
  bicicleta_id: string;
  estado_anterior: EstadoMantenimiento;
  estado_nuevo: EstadoMantenimiento;
  tecnico_id: string;
  tecnico_responsable: string;
  fecha_actualizacion: string;
}

@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private readonly api = 'http://localhost:3000/api/mantenimientos';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(this.api);
  }

  actualizarEstado(bicicletaId: string, estado: EstadoMantenimiento): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(this.api, { bicicleta_id: bicicletaId, estado });
  }
}
