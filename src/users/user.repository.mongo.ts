import { Collection, Db, ObjectId } from 'mongodb';
import { COLLECTIONS } from '../config/collections';
import { User } from './user.entity';
import { UserRepository } from './user.repository.interface';

interface UserDocument extends Omit<User, 'id'> {
    _id?: ObjectId;
}

export class UserRepositoryMongo implements UserRepository {
    private readonly collection: Collection<UserDocument>;

    constructor(db: Db) {
        this.collection = db.collection<UserDocument>(COLLECTIONS.users);
    }

    async ensureIndexes(): Promise<void> {
        // Los índices son parciales: DNI y email pueden faltar en cuentas creadas con Google.
        await Promise.all([
            this.collection.createIndex(
                { dni: 1 },
                { unique: true, partialFilterExpression: { dni: { $type: 'string' } } }
            ),
            this.collection.createIndex(
                { email: 1 },
                { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
            )
        ]);
    }

    private toEntity(doc: UserDocument): User {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async findAll(): Promise<User[]> {
        const docs = await this.collection.find().sort({ createdAt: -1 }).toArray();
        return docs.map(doc => this.toEntity(doc));
    }

    async findById(id: string): Promise<User | null> {
        if (!ObjectId.isValid(id)) return null;
        const doc = await this.collection.findOne({ _id: new ObjectId(id) });
        return doc ? this.toEntity(doc) : null;
    }

    async findByDni(dni: string): Promise<User | null> {
        const doc = await this.collection.findOne({ dni });
        return doc ? this.toEntity(doc) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const doc = await this.collection.findOne({ email });
        return doc ? this.toEntity(doc) : null;
    }

    async findByGoogleId(googleId: string): Promise<User | null> {
        const doc = await this.collection.findOne({ googleId });
        return doc ? this.toEntity(doc) : null;
    }

    async findByName(name: string): Promise<User | null> {
        const doc = await this.collection.findOne({ nombre: name });
        return doc ? this.toEntity(doc) : null;
    }

    async create(user: Omit<User, 'id'>): Promise<User> {
        const now = new Date();
        const doc: UserDocument = { ...user, createdAt: now, updatedAt: now };
        const result = await this.collection.insertOne(doc);
        return this.toEntity({ ...doc, _id: result.insertedId });
    }

    async update(id: string, user: Partial<Omit<User, 'id'>>): Promise<User | null> {
        if (!ObjectId.isValid(id)) return null;
        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...user, updatedAt: new Date() } },
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
