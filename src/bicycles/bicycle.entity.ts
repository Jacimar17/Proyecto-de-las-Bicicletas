export type BicycleStatus =
    | 'DISPONIBLE'
    | 'RESERVADA'
    | 'EN_USO'
    | 'EN_MANTENIMIENTO'
    | 'APTA'
    | 'NO_APTA';

export interface Bicycle {
    id?: string;
    codigo: string;
    modelo: string;
    ubicacion: string;
    estado: BicycleStatus;
    estacion_id: string | null;
    usuario_id?: string | null;
    fecha_ultima_revision: Date | null;
    tecnico_responsable: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
