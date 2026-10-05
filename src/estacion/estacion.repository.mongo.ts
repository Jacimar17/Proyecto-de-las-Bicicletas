import { Collection, Db, ObjectId } from 'mongodb';
import { Estacion } from './estacion.entity';
import { EstacionRepository } from './estacion.repository.interface';

interface EstacionDocument extends Omit<Estacion, 'id'> {
    _id?: ObjectId;
}

export class EstacionRepositoryMongo implements EstacionRepository {

    private readonly collection: Collection<EstacionDocument>;

    constructor(db: Db) {
        this.collection = db.collection<EstacionDocument>('estaciones');
    }

    private toEntity(doc: EstacionDocument): Estacion {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async findAll(): Promise<Estacion[]> {
        const docs = await this.collection.find().toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async findById(id: string): Promise<Estacion | null> {
        if (!ObjectId.isValid(id)) return null;
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toEntity(doc) : null;
    }

    async create(estacion: Estacion): Promise<Estacion> {
        const now = new Date();
        const doc: EstacionDocument = { ...estacion, createdAt: now, updatedAt: now };
        const result = await this.collection.insertOne(doc);
        return { ...estacion, id: result.insertedId.toString(), createdAt: now, updatedAt: now };
    }

    async update(id: string, estacion: Partial<Estacion>): Promise<Estacion | null> {
        if (!ObjectId.isValid(id)) return null;
        const updateData = { ...estacion, updatedAt: new Date() };
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
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
