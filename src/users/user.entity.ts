export type UserRole = 'admin' | 'cliente' | 'tecnico';

export interface User {
    id?: string;
    dni?: string;
    nombre: string;
    apellido?: string;
    email: string;
    password?: string;
    googleId?: string;
    bloqueado: boolean;
    role: UserRole;
    puntuacion: number;
    suspendidoHasta?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export type PublicUser = Pick<
    User,
    'id' | 'dni' | 'nombre' | 'apellido' | 'email' | 'bloqueado' | 'role' | 'puntuacion' | 'suspendidoHasta'
>;
