import { Viaje } from './viaje.entity';

export interface ViajeRepository {
    ensureIndexes(): Promise<void>;
    create(viaje: Viaje): Promise<Viaje>;
    findActiveByUser(usuarioId: string): Promise<Viaje | null>;
    findById(id: string): Promise<Viaje | null>;
    findHistoryByUser(usuarioId: string): Promise<Viaje[]>;
    finish(id: string, usuarioId: string, estacionDestinoId: string, fechaFin: Date): Promise<Viaje | null>;
}
