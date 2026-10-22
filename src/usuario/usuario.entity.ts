export interface Usuario {
    id?: string;
    dni: string;
    nombre: string;
    email: string;
    password: string;
    bloqueado: boolean;
    role: 'admin' | 'cliente';
    createdAt?: Date;
    updatedAt?: Date;
}
