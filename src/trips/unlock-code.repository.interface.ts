import { UnlockCode } from './unlock-code.entity';

export interface UnlockCodeRepository {
    ensureIndexes(): Promise<void>;
    issue(code: Omit<UnlockCode, 'id' | 'intentos'>): Promise<void>;
    findActive(userId: string, bicycleId: string, now: Date): Promise<UnlockCode | null>;
    recordFailedAttempt(id: string, maxAttempts: number): Promise<void>;
    consume(
        id: string,
        userId: string,
        bicycleId: string,
        codeHash: string,
        now: Date
    ): Promise<boolean>;
}
