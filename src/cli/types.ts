export interface Bicycle {
  _id?: string;
  code: string;
  currentStation: string;
  status: string;
  unlockCode: string;
  rentedBy?: string | null;
}

export interface User {
  _id?: string;
  name: string;
  lastName?: string;
  email: string;
  role?: string;
  puntuacion?: number;
  suspendidoHasta?: string | null;
  bloqueado?: boolean;
}

export interface SessionUser extends User {
  token: string;
  role: string;
}

export interface ApiData {
  ok?: boolean;
  mensaje?: string;
  message?: string;
  error?: string;
  token?: string;
  user?: User;
  users?: User[];
  total?: number;
  data?: unknown;
  puntuacion?: number;
  suspendidoHasta?: string | null;
  bloqueado?: boolean;
}

export interface Station {
  id: string;
  nombre: string;
  barrio: string;
  direccion: string;
  activa: boolean;
  disponibles?: number;
  bicicletas?: StationBicycle[];
}

export interface StationBicycle {
  id: string;
  codigo: string;
  modelo: string;
  estado: string;
  estacion_id: string | null;
}

export interface Trip {
  id: string;
  usuarioId: string;
  bicicletaId: string;
  estacionOrigenId: string;
  estacionDestinoId: string | null;
  fechaInicio: string;
  fechaFin: string | null;
}

export interface ApiResult {
  status: number;
  data: ApiData;
}
