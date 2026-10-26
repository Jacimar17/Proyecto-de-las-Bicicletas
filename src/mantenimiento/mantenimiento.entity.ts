export type EstadoMantenimiento = 'DISPONIBLE' | 'EN_MANTENIMIENTO';

export interface Mantenimiento {
    id?: string;
    bicicleta_id: string;
    estado_anterior: EstadoMantenimiento;
    estado_nuevo: EstadoMantenimiento;
    tecnico_id: string;
    tecnico_responsable: string;
    fecha_actualizacion: Date;
}
