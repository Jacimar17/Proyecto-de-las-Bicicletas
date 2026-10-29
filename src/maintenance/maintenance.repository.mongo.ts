import { Collection, Db, ObjectId } from 'mongodb';
import { COLLECTIONS } from '../config/collections';
import { Maintenance } from './maintenance.entity';
import { MaintenanceRepository } from './maintenance.repository.interface';

interface MaintenanceDocument extends Omit<Maintenance, 'id'> {
    _id?: ObjectId;
}

export class MaintenanceRepositoryMongo implements MaintenanceRepository {
    private readonly collection: Collection<MaintenanceDocument>;

    constructor(db: Db) {
        this.collection = db.collection<MaintenanceDocument>(COLLECTIONS.maintenances);
    }

    private toEntity(doc: MaintenanceDocument): Maintenance {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async create(maintenance: Maintenance): Promise<Maintenance> {
        const { id: _id, ...data } = maintenance;
        const result = await this.collection.insertOne(data);
        return { ...data, id: result.insertedId.toString() };
    }

    async findAll(): Promise<Maintenance[]> {
        const docs = await this.collection.find().sort({ fecha_actualizacion: -1 }).toArray();
        return docs.map(doc => this.toEntity(doc));
    }
}
