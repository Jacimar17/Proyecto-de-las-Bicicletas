import { CodigoDesbloqueo } from './codigo-desbloqueo.entity';

export interface CodigoDesbloqueoRepository {
    ensureIndexes(): Promise<void>;
    issue(codigo: Omit<CodigoDesbloqueo, 'id' | 'intentos'>): Promise<void>;
    findActive(usuarioId: string, bicicletaId: string, now: Date): Promise<CodigoDesbloqueo | null>;
    recordFailedAttempt(id: string, maxAttempts: number): Promise<void>;
    consume(
        id: string,
        usuarioId: string,
        bicicletaId: string,
        codigoHash: string,
        now: Date
    ): Promise<boolean>;
}
