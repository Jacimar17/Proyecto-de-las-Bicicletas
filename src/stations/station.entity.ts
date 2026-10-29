export interface Station {
    id?: string;
    nombre: string;
    barrio: string;
    direccion: string;
    lat: number;
    lng: number;
    capacidad: number;
    activa: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
