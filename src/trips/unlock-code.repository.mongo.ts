import { Collection, Db, ObjectId } from 'mongodb';
import { COLLECTIONS } from '../config/collections';
import { UnlockCode } from './unlock-code.entity';
import { UnlockCodeRepository } from './unlock-code.repository.interface';

interface UnlockCodeDocument extends Omit<UnlockCode, 'id'> {
    _id?: ObjectId;
}

export class UnlockCodeRepositoryMongo implements UnlockCodeRepository {
    private readonly collection: Collection<UnlockCodeDocument>;

    constructor(db: Db) {
        this.collection = db.collection<UnlockCodeDocument>(COLLECTIONS.unlockCodes);
    }

    async ensureIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex(
                { usuario_id: 1, bicicleta_id: 1 },
                { unique: true }
            ),
            this.collection.createIndex({ expira_en: 1 }, { expireAfterSeconds: 0 })
        ]);
    }

    private toEntity(document: UnlockCodeDocument): UnlockCode {
        const { _id, ...rest } = document;
        return { id: _id?.toString(), ...rest };
    }

    async issue(code: Omit<UnlockCode, 'id' | 'intentos'>): Promise<void> {
        const document = await this.collection.findOneAndUpdate(
            { usuario_id: code.usuario_id, bicicleta_id: code.bicicleta_id },
            { $set: { ...code, intentos: 0 } },
            { upsert: true, returnDocument: 'after' }
        );
        if (!document) throw new Error('No se pudo guardar el código de desbloqueo');
    }

    async findActive(userId: string, bicycleId: string, now: Date): Promise<UnlockCode | null> {
        const document = await this.collection.findOne({
            usuario_id: userId,
            bicicleta_id: bicycleId,
            expira_en: { $gt: now }
        });
        return document ? this.toEntity(document) : null;
    }

    async recordFailedAttempt(id: string, maxAttempts: number): Promise<void> {
        if (!ObjectId.isValid(id)) return;
        const document = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id), intentos: { $lt: maxAttempts } },
            { $inc: { intentos: 1 } },
            { returnDocument: 'after' }
        );
        if (document && document.intentos >= maxAttempts) {
            await this.collection.deleteOne({ _id: new ObjectId(id) });
        }
    }

    async consume(
        id: string,
        userId: string,
        bicycleId: string,
        codeHash: string,
        now: Date
    ): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false;
        const document = await this.collection.findOneAndDelete({
            _id: new ObjectId(id),
            usuario_id: userId,
            bicicleta_id: bicycleId,
            codigo_hash: codeHash,
            expira_en: { $gt: now }
        });
        return document !== null;
    }
}
