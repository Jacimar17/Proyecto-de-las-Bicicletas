export type UserRole = "admin" | "tecnico" | "cliente";

export interface User {
  id?: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  dni?: string;
  nombre?: string;
  puntuacion: number;
  suspendidoHasta?: Date | null;
  bloqueado?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PublicUser = Omit<User, "password"> & { _id: string; id: string };
