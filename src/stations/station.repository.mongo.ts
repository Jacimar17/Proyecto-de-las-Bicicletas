import { Collection, Db, ObjectId } from 'mongodb';
import { COLLECTIONS } from '../config/collections';
import { Station } from './station.entity';
import { StationRepository } from './station.repository.interface';

interface StationDocument extends Omit<Station, 'id'> {
    _id?: ObjectId;
}

export class StationRepositoryMongo implements StationRepository {
    private readonly collection: Collection<StationDocument>;

    constructor(db: Db) {
        this.collection = db.collection<StationDocument>(COLLECTIONS.stations);
    }

    private toEntity(doc: StationDocument): Station {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async findAll(): Promise<Station[]> {
        const docs = await this.collection.find().toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async findById(id: string): Promise<Station | null> {
        if (!ObjectId.isValid(id)) return null;
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toEntity(doc) : null;
    }

    async create(station: Station): Promise<Station> {
        const now = new Date();
        const doc: StationDocument = { ...station, createdAt: now, updatedAt: now };
        const result = await this.collection.insertOne(doc);
        return { ...station, id: result.insertedId.toString(), createdAt: now, updatedAt: now };
    }

    async update(id: string, station: Partial<Station>): Promise<Station | null> {
        if (!ObjectId.isValid(id)) return null;
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...station, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        return result ? this.toEntity(result) : null;
    }

    async delete(id: string): Promise<boolean> {
        if (!ObjectId.isValid(id)) return false;
        const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount === 1;
    }
}
