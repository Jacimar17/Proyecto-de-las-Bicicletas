import { Router } from 'express';
import { Db, ObjectId } from 'mongodb';
import { ApiError, errorMessage, errorStatus } from '../common/api-error';
import { COLLECTIONS } from '../config/collections';
import { requerirRol, verificarToken } from '../usuario/auth.middleware';

export const ZONAS_BICICLETA = ['cadena', 'rueda_trasera', 'rueda_delantera', 'manubrio', 'frenos', 'asiento'] as const;
export type ZonaBicicleta = typeof ZONAS_BICICLETA[number];

export interface TareaMantenimiento {
    id?: string;
    zona: ZonaBicicleta;
    nombre: string;
}

const TAREAS_POR_DEFECTO: TareaMantenimiento[] = [
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

interface TareaDocument {
    _id?: ObjectId;
    zona: ZonaBicicleta;
    nombre: string;
}

export function crearTareasMantenimientoRoutes(db: Db): Router {
    const router = Router();
    const collection = db.collection<TareaDocument>(COLLECTIONS.maintenanceTasks);
    const toEntity = ({ _id, ...rest }: TareaDocument): TareaMantenimiento => ({ id: _id?.toString(), ...rest });

    router.get('/tareas-mantenimiento', verificarToken, requerirRol(['admin', 'tecnico']), async (_req, res) => {
        try {
            if (await collection.countDocuments() === 0) {
                await collection.insertMany(TAREAS_POR_DEFECTO.map(tarea => ({ ...tarea })));
            }
            const docs = await collection.find().toArray();
            res.status(200).json(docs.map(toEntity));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    });

    router.post('/tareas-mantenimiento', verificarToken, requerirRol('admin'), async (req, res) => {
        try {
            const zona = req.body?.zona;
            const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
            if (!ZONAS_BICICLETA.includes(zona)) throw new ApiError('La zona de la bicicleta no es válida', 400);
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

    router.delete('/tareas-mantenimiento/:id', verificarToken, requerirRol('admin'), async (req, res) => {
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
