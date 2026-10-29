import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';

export interface Viaje {
  id?: string;
  usuario_id: string;
  bicicleta_id: string;
  estacion_origen_id: string;
  estacion_destino_id: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export interface CodigoDesbloqueo {
  codigo: string;
  expira_en: string;
}

@Injectable({ providedIn: 'root' })
export class ViajeService {
  private readonly api = `${API_BASE_URL}/viajes`;

  constructor(private http: HttpClient) {}

  getHistory(): Observable<Viaje[]> {
    return this.http.get<Viaje[]>(this.api);
  }

  getAll(): Observable<Viaje[]> {
    return this.http.get<Viaje[]>(`${this.api}/todos`);
  }

  getActive(): Observable<Viaje | null> {
    return this.http.get<Viaje | null>(`${this.api}/activo`);
  }

  generateUnlockCode(bicicletaId: string): Observable<CodigoDesbloqueo> {
    return this.http.post<CodigoDesbloqueo>(`${this.api}/codigo-desbloqueo`, {
      bicicleta_id: bicicletaId
    });
  }

  start(bicicletaId: string, estacionOrigenId: string, codigoDesbloqueo: string): Observable<Viaje> {
    return this.http.post<Viaje>(this.api, {
      bicicleta_id: bicicletaId,
      estacion_origen_id: estacionOrigenId,
      codigo_desbloqueo: codigoDesbloqueo
    });
  }

  finish(estacionDestinoId: string): Observable<Viaje> {
    return this.http.patch<Viaje>(`${this.api}/activo/finalizar`, {
      estacion_destino_id: estacionDestinoId
    });
  }
}
