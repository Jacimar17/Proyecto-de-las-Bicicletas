import { Collection, Db, ObjectId } from 'mongodb';
import { Mantenimiento } from './mantenimiento.entity';
import { COLLECTIONS } from '../config/collections';
import { MantenimientoRepository } from './mantenimiento.repository.interface';

interface MantenimientoDocument extends Omit<Mantenimiento, 'id'> {
    _id?: ObjectId;
}

export class MantenimientoRepositoryMongo implements MantenimientoRepository {
    private readonly collection: Collection<MantenimientoDocument>;

    constructor(db: Db) {
        this.collection = db.collection<MantenimientoDocument>(COLLECTIONS.maintenances);
    }

    private toEntity(doc: MantenimientoDocument): Mantenimiento {
        const { _id, ...rest } = doc;
        return { id: _id?.toString(), ...rest };
    }

    async create(mantenimiento: Mantenimiento): Promise<Mantenimiento> {
        const { id: _id, ...data } = mantenimiento;
        const result = await this.collection.insertOne(data);
        return { ...data, id: result.insertedId.toString() };
    }

    async findAll(): Promise<Mantenimiento[]> {
        const docs = await this.collection.find().sort({ fecha_actualizacion: -1 }).toArray();
        return docs.map(doc => this.toEntity(doc));
    }
}
