import { Router } from 'express';
import { Db, ObjectId } from 'mongodb';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { ApiError, errorMessage, errorStatus } from '../common/api-error';
import { COLLECTIONS } from '../config/collections';

export const BICYCLE_ZONES = ['cadena', 'rueda_trasera', 'rueda_delantera', 'manubrio', 'frenos', 'asiento'] as const;
export type BicycleZone = typeof BICYCLE_ZONES[number];

export interface MaintenanceTask {
    id?: string;
    zona: BicycleZone;
    nombre: string;
}

const DEFAULT_TASKS: MaintenanceTask[] = [
    { zona: 'cadena', nombre: 'Lubricar' },
    { zona: 'cadena', nombre: 'Tensionar cadena' },
    { zona: 'cadena', nombre: 'Cambiar cadena' },
    { zona: 'rueda_trasera', nombre: 'Inflar neumático' },
    { zona: 'rueda_trasera', nombre: 'Parche' },
    { zona: 'rueda_trasera', nombre: 'Cambio de cubierta' },
    { zona: 'rueda_delantera', nombre: 'Inflar neumático' },
    { zona: 'rueda_delantera', nombre: 'Parche' },
    { zona: 'rueda_delantera', nombre: 'Cambio de cubierta' },
    { zona: 'manubrio', nombre: 'Ajustar manubrio' },
    { zona: 'manubrio', nombre: 'Cambiar puños' },
    { zona: 'frenos', nombre: 'Ajustar frenos' },
    { zona: 'frenos', nombre: 'Cambiar pastillas' },
    { zona: 'asiento', nombre: 'Ajustar altura' },
    { zona: 'asiento', nombre: 'Cambiar asiento' },
];

interface TaskDocument {
    _id?: ObjectId;
    zona: BicycleZone;
    nombre: string;
}

export function createMaintenanceTaskRoutes(db: Db): Router {
    const router = Router();
    const collection = db.collection<TaskDocument>(COLLECTIONS.maintenanceTasks);
    const toEntity = ({ _id, ...rest }: TaskDocument): MaintenanceTask => ({ id: _id?.toString(), ...rest });

    router.get('/', authenticate, requireRole('admin', 'tecnico'), async (_req, res) => {
        try {
            if (await collection.countDocuments() === 0) {
                await collection.insertMany(DEFAULT_TASKS.map(task => ({ ...task })));
            }
            const docs = await collection.find().toArray();
            res.status(200).json(docs.map(toEntity));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    });

    router.post('/', authenticate, requireRole('admin'), async (req, res) => {
        try {
            const zona = req.body?.zona;
            const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
            if (!BICYCLE_ZONES.includes(zona)) throw new ApiError('La zona de la bicicleta no es válida', 400);
            if (!nombre) throw new ApiError('El nombre de la tarea es obligatorio', 400);
            if (await collection.findOne({ zona, nombre })) {
                throw new ApiError('Esa tarea ya existe en la zona indicada', 409);
            }
            const result = await collection.insertOne({ zona, nombre });
            res.status(201).json({ id: result.insertedId.toString(), zona, nombre });
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    });

    router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
        try {
            const id = String(req.params.id);
            if (!ObjectId.isValid(id)) throw new ApiError('Tarea no encontrada', 404);
            const result = await collection.deleteOne({ _id: new ObjectId(id) });
            if (!result.deletedCount) throw new ApiError('Tarea no encontrada', 404);
            res.status(204).send();
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    });

    return router;
}
