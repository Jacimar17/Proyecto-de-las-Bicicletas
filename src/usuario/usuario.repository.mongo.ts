import { Collection, Db, ObjectId } from 'mongodb';
import { Usuario } from './usuario.entity';
import { UsuarioRepository } from './usuario.repository.interface';

interface UsuarioDocument extends Omit<Usuario, 'id'> {
    _id?: ObjectId;
}

export class UsuarioRepositoryMongo implements UsuarioRepository {
    private readonly collection: Collection<UsuarioDocument>;

    constructor(db: Db) {
        this.collection = db.collection<UsuarioDocument>('usuarios');
    }

    async ensureIndexes(): Promise<void> {
        await Promise.all([
            this.collection.createIndex({ dni: 1 }, { unique: true }),
            this.collection.createIndex({ email: 1 }, { unique: true })
        ]);
    }

    private toEntity(doc: UsuarioDocument): Usuario {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async findAll(): Promise<Usuario[]> {
        const docs = await this.collection.find().sort({ createdAt: -1 }).toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async findById(id: string): Promise<Usuario | null> {
        if (!ObjectId.isValid(id)) return null;
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toEntity(doc) : null;
    }

    async findByDni(dni: string): Promise<Usuario | null> {
        const doc = await this.collection.findOne({ dni });
        return doc ? this.toEntity(doc) : null;
    }

    async findByEmail(email: string): Promise<Usuario | null> {
        const doc = await this.collection.findOne({ email });
        return doc ? this.toEntity(doc) : null;
    }

    async create(usuario: Usuario): Promise<Usuario> {
        const now = new Date();
        const { id: _id, ...data } = usuario;
        const doc: UsuarioDocument = { ...data, createdAt: now, updatedAt: now };
        const result = await this.collection.insertOne(doc);
        return this.toEntity({ ...doc, _id: result.insertedId });
    }

    async update(id: string, usuario: Partial<Usuario>): Promise<Usuario | null> {
        if (!ObjectId.isValid(id)) return null;
        const { id: _userId, ...update } = usuario;
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...update, updatedAt: new Date() } },
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
