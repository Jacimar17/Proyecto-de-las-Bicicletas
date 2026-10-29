import { Collection, Db, ObjectId } from 'mongodb';
import { COLLECTIONS } from '../config/collections';
import { Bicycle, BicycleStatus } from './bicycle.entity';
import { BicycleRepository } from './bicycle.repository.interface';

interface BicycleDocument extends Omit<Bicycle, 'id'> {
    _id?: ObjectId;
}

export class BicycleRepositoryMongo implements BicycleRepository {
    private readonly collection: Collection<BicycleDocument>;

    constructor(db: Db) {
        this.collection = db.collection<BicycleDocument>(COLLECTIONS.bicycles);
    }

    private toEntity(doc: BicycleDocument): Bicycle {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async findAll(): Promise<Bicycle[]> {
        const docs = await this.collection.find().toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async findById(id: string): Promise<Bicycle | null> {
        if (!ObjectId.isValid(id)) return null;
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toEntity(doc) : null;
    }

    async findByCode(codigo: string): Promise<Bicycle | null> {
        const doc = await this.collection.findOne({ codigo });
        return doc ? this.toEntity(doc) : null;
    }

    async findByStation(stationId: string): Promise<Bicycle[]> {
        const docs = await this.collection.find({ estacion_id: stationId }).toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async create(bicycle: Bicycle): Promise<Bicycle> {
        const now = new Date();
        const { id: _id, ...data } = bicycle;
        const doc: BicycleDocument = { ...data, createdAt: now, updatedAt: now };
        const result = await this.collection.insertOne(doc);
        return { ...bicycle, id: result.insertedId.toString(), createdAt: now, updatedAt: now };
    }

    async update(id: string, bicycle: Partial<Bicycle>): Promise<Bicycle | null> {
        if (!ObjectId.isValid(id)) return null;
        const { id: _id, ...data } = bicycle;
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        return result ? this.toEntity(result) : null;
    }

    async updateIfStatus(
        id: string,
        estado: BicycleStatus,
        bicycle: Partial<Bicycle>
    ): Promise<Bicycle | null> {
        if (!ObjectId.isValid(id)) return null;
        const { id: _id, ...data } = bicycle;
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id), estado },
            { $set: { ...data, updatedAt: new Date() } },
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
