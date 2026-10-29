export interface Trip {
    id?: string;
    usuario_id: string;
    bicicleta_id: string;
    estacion_origen_id: string;
    estacion_destino_id: string | null;
    fecha_inicio: Date;
    fecha_fin: Date | null;
}
