export interface Estacion {
    id?: string;
    nombre: string;
    barrio: string;
    direccion: string;
    capacidad: number;
    activa: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
