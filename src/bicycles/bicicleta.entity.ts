export type EstadoBicicleta =
    | 'DISPONIBLE'
    | 'RESERVADA'
    | 'EN_USO'
    | 'APTA'
    | 'NO_APTA';

export interface Bicicleta {
    id?: string;
    codigo: string;
    modelo: string;
    ubicacion: string;
    estado: EstadoBicicleta;
    estacion_id: string | null;
    fecha_ultima_revision: Date | null;
    tecnico_responsable: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
