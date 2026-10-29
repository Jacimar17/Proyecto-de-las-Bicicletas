import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Viaje {
  id?: string;
  usuario_id: string;
  bicicleta_id: string;
  estacion_origen_id: string;
  estacion_destino_id: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
}

@Injectable({ providedIn: 'root' })
export class ViajeService {
  private readonly api = 'http://localhost:3000/api/viajes';

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
