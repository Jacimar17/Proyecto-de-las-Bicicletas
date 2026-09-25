import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Bicicleta {
  id?: string;
  codigo: string;
  modelo: string;
  ubicacion: string;
  estado: 'DISPONIBLE' | 'RESERVADA' | 'EN_USO' | 'APTA' | 'NO_APTA';
  fecha_ultima_revision: string | null;
  tecnico_responsable: string | null;
}

@Injectable({ providedIn: 'root' })
export class BicicletaService {

  private readonly api = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getAll(): Observable<Bicicleta[]> {
    return this.http.get<Bicicleta[]>(`${this.api}/bicicletas`);
  }

  create(bicicleta: Bicicleta): Observable<Bicicleta> {
    return this.http.post<Bicicleta>(`${this.api}/bicicleta`, bicicleta);
  }

  update(id: string, bicicleta: Partial<Bicicleta>): Observable<Bicicleta> {
    return this.http.put<Bicicleta>(`${this.api}/bicicleta/${id}`, bicicleta);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/bicicleta/${id}`);
  }
}
