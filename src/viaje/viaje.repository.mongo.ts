import { Collection, Db, ObjectId } from 'mongodb';
import { Viaje } from './viaje.entity';
import { ViajeRepository } from './viaje.repository.interface';

interface ViajeDocument extends Omit<Viaje, 'id'> {
    _id?: ObjectId;
}

export class ViajeRepositoryMongo implements ViajeRepository {
    private readonly collection: Collection<ViajeDocument>;

    constructor(db: Db) {
        this.collection = db.collection<ViajeDocument>('viajes');
    }

    async ensureIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex({ usuario_id: 1, fecha_inicio: -1 }),
            this.collection.createIndex(
                { usuario_id: 1 },
                { unique: true, partialFilterExpression: { fecha_fin: null } }
            )
        ]);
    }

    private toEntity(doc: ViajeDocument): Viaje {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async create(viaje: Viaje): Promise<Viaje> {
        const { id: _id, ...data } = viaje;
        const result = await this.collection.insertOne(data);
        return { ...data, id: result.insertedId.toString() };
    }

    async findActiveByUser(usuarioId: string): Promise<Viaje | null> {
        const doc = await this.collection.findOne({ usuario_id: usuarioId, fecha_fin: null });
        return doc ? this.toEntity(doc) : null;
    }

    async findById(id: string): Promise<Viaje | null> {
        if (!ObjectId.isValid(id)) return null;
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toEntity(doc) : null;
    }

    async findHistoryByUser(usuarioId: string): Promise<Viaje[]> {
        const docs = await this.collection.find({ usuario_id: usuarioId })
            .sort({ fecha_inicio: -1 })
            .toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async finish(
        id: string,
        usuarioId: string,
        estacionDestinoId: string,
        fechaFin: Date
    ): Promise<Viaje | null> {
        if (!ObjectId.isValid(id)) return null;
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id), usuario_id: usuarioId, fecha_fin: null },
            { $set: { estacion_destino_id: estacionDestinoId, fecha_fin: fechaFin } },
            { returnDocument: 'after' }
        );
        return result ? this.toEntity(result) : null;
    }
}
