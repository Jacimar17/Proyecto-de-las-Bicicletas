export type UserRole = "admin" | "cliente";

export interface User {
  id?: string;
  name: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  dni?: string;
  nombre?: string;
  bloqueado?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
