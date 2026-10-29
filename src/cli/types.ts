export interface Bicycle {
  id: string;
  codigo: string;
  modelo: string;
  ubicacion: string;
  estado: string;
  estacion_id: string | null;
}

export interface User {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
  dni?: string;
  role?: string;
  puntuacion?: number;
  suspendidoHasta?: string | null;
  bloqueado?: boolean;
}

export interface SessionUser {
  token: string;
  role: string;
  nombre: string;
  email: string;
}

export interface ApiData {
  message?: string;
  error?: string;
  codigo?: string;
  expira_en?: string;
  token?: string;
  role?: string;
  user?: User;
  nombre?: string;
  email?: string;
  puntuacion?: number;
  suspendidoHasta?: string | null;
  bloqueado?: boolean;
  fecha_fin?: string | null;
  fecha_inicio?: string;
}

export interface Station {
  id: string;
  nombre: string;
  barrio: string;
  direccion: string;
  activa: boolean;
  disponibles?: number;
  bicicletas?: Bicycle[];
}

export interface Trip {
  id: string;
  usuario_id: string;
  bicicleta_id: string;
  estacion_origen_id: string;
  estacion_destino_id: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
}

export interface ApiResult {
  status: number;
  data: ApiData;
}
