export interface CodigoDesbloqueo {
    id?: string;
    usuario_id: string;
    bicicleta_id: string;
    codigo_hash: string;
    expira_en: Date;
    intentos: number;
}
