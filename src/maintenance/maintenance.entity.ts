export type MaintenanceStatus = 'DISPONIBLE' | 'EN_MANTENIMIENTO';

export interface PerformedTask {
    zona: string;
    tarea: string;
}

export interface Maintenance {
    id?: string;
    bicicleta_id: string;
    estado_anterior: MaintenanceStatus;
    estado_nuevo: MaintenanceStatus;
    tecnico_id: string;
    tecnico_responsable: string;
    fecha_actualizacion: Date;
    estacion_id?: string | null;
    tareas?: PerformedTask[];
}
