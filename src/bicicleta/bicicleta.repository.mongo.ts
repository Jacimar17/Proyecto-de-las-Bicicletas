import { Collection, Db, ObjectId } from 'mongodb';
import { Bicicleta } from './bicicleta.entity';
import { BicicletaRepository } from './bicicleta.repository.interface';

interface BicicletaDocument extends Omit<Bicicleta, 'id'> {
    _id?: ObjectId;
}

export class BicicletaRepositoryMongo implements BicicletaRepository {

    private readonly collection: Collection<BicicletaDocument>;

    constructor(db: Db) {
        this.collection = db.collection<BicicletaDocument>('bicicletas');
    }

    private toEntity(doc: BicicletaDocument): Bicicleta {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async findAll(): Promise<Bicicleta[]> {
        const docs = await this.collection.find().toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async findById(id: string): Promise<Bicicleta | null> {
        if (!ObjectId.isValid(id)) return null;
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toEntity(doc) : null;
    }

    async findByCodigo(codigo: string): Promise<Bicicleta | null> {
        const doc = await this.collection.findOne({ codigo });
        return doc ? this.toEntity(doc) : null;
    }

    async findByEstacion(estacion_id: string): Promise<Bicicleta[]> {
        const docs = await this.collection.find({ estacion_id }).toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async create(bicicleta: Bicicleta): Promise<Bicicleta> {
        const now = new Date();
        const doc: BicicletaDocument = { ...bicicleta, createdAt: now, updatedAt: now };
        const result = await this.collection.insertOne(doc);
        return { ...bicicleta, id: result.insertedId.toString(), createdAt: now, updatedAt: now };
    }

    async update(id: string, bicicleta: Partial<Bicicleta>): Promise<Bicicleta | null> {
        if (!ObjectId.isValid(id)) return null;
        const updateData = { ...bicicleta, updatedAt: new Date() };
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
