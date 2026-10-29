import { Collection, Db, ObjectId } from 'mongodb';
import { COLLECTIONS } from '../config/collections';
import { CodigoDesbloqueo } from './codigo-desbloqueo.entity';
import { CodigoDesbloqueoRepository } from './codigo-desbloqueo.repository.interface';

interface CodigoDesbloqueoDocument extends Omit<CodigoDesbloqueo, 'id'> {
    _id?: ObjectId;
}

export class CodigoDesbloqueoRepositoryMongo implements CodigoDesbloqueoRepository {
    private readonly collection: Collection<CodigoDesbloqueoDocument>;

    constructor(db: Db) {
        this.collection = db.collection<CodigoDesbloqueoDocument>(COLLECTIONS.unlockCodes);
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

    private toEntity(document: CodigoDesbloqueoDocument): CodigoDesbloqueo {
        const { _id, ...rest } = document;
        return { id: _id?.toString(), ...rest };
    }

    async issue(codigo: Omit<CodigoDesbloqueo, 'id' | 'intentos'>): Promise<void> {
        const document = await this.collection.findOneAndUpdate(
            { usuario_id: codigo.usuario_id, bicicleta_id: codigo.bicicleta_id },
            { $set: { ...codigo, intentos: 0 } },
            { upsert: true, returnDocument: 'after' }
        );
        if (!document) throw new Error('No se pudo guardar el código de desbloqueo');
    }

    async findActive(usuarioId: string, bicicletaId: string, now: Date): Promise<CodigoDesbloqueo | null> {
        const document = await this.collection.findOne({
            usuario_id: usuarioId,
            bicicleta_id: bicicletaId,
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
        usuarioId: string,
        bicicletaId: string,
        codigoHash: string,
        now: Date
    ): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false;
        const document = await this.collection.findOneAndDelete({
            _id: new ObjectId(id),
            usuario_id: usuarioId,
            bicicleta_id: bicicletaId,
            codigo_hash: codigoHash,
            expira_en: { $gt: now }
        });
        return document !== null;
    }
}
