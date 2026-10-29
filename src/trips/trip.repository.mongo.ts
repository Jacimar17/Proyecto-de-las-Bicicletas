import { Collection, Db, ObjectId } from 'mongodb';
import { COLLECTIONS } from '../config/collections';
import { Trip } from './trip.entity';
import { TripRepository } from './trip.repository.interface';

interface TripDocument extends Omit<Trip, 'id'> {
    _id?: ObjectId;
}

export class TripRepositoryMongo implements TripRepository {
    private readonly collection: Collection<TripDocument>;

    constructor(db: Db) {
        this.collection = db.collection<TripDocument>(COLLECTIONS.trips);
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

    private toEntity(doc: TripDocument): Trip {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async create(trip: Trip): Promise<Trip> {
        const { id: _id, ...data } = trip;
        const result = await this.collection.insertOne(data);
        return { ...data, id: result.insertedId.toString() };
    }

    async findActiveByUser(userId: string): Promise<Trip | null> {
        const doc = await this.collection.findOne({ usuario_id: userId, fecha_fin: null });
        return doc ? this.toEntity(doc) : null;
    }

    async findById(id: string): Promise<Trip | null> {
        if (!ObjectId.isValid(id)) return null;
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toEntity(doc) : null;
    }

    async findAll(): Promise<Trip[]> {
        const docs = await this.collection.find({}).sort({ fecha_inicio: -1 }).toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async findHistoryByUser(userId: string): Promise<Trip[]> {
        const docs = await this.collection.find({ usuario_id: userId })
            .sort({ fecha_inicio: -1 })
            .toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async finish(
        id: string,
        userId: string,
        destinationStationId: string,
        finishedAt: Date
    ): Promise<Trip | null> {
        if (!ObjectId.isValid(id)) return null;
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id), usuario_id: userId, fecha_fin: null },
            { $set: { estacion_destino_id: destinationStationId, fecha_fin: finishedAt } },
            { returnDocument: 'after' }
        );
        return result ? this.toEntity(result) : null;
    }
}
