export type RolUsuario = 'admin' | 'cliente' | 'tecnico';

export interface Usuario {
    id?: string;
    dni: string;
    nombre: string;
    email: string;
    password: string;
    bloqueado: boolean;
    role: RolUsuario;
    createdAt?: Date;
    updatedAt?: Date;
}
