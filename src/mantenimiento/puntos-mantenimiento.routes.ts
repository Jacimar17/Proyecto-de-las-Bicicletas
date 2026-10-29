import { Router } from 'express';
import { Db, ObjectId } from 'mongodb';
import { ApiError, errorMessage, errorStatus } from '../common/api-error';
import { COLLECTIONS } from '../config/collections';
import { requerirRol, verificarToken } from '../usuario/auth.middleware';
import { TareaMantenimiento, ZONAS_BICICLETA, ZonaBicicleta } from './tarea-mantenimiento.routes';

export interface PuntoMantenimiento {
    id?: string;
    zona: ZonaBicicleta;
    nombre: string;
    x: number;
    y: number;
}

interface PuntoDocument {
    _id?: ObjectId;
    zona: ZonaBicicleta;
    nombre: string;
    x: number;
    y: number;
}

// Coordenadas relativas (%) sobre la imagen del taller.
const PUNTOS_POR_DEFECTO: Omit<PuntoMantenimiento, 'id'>[] = [
    { zona: 'asiento', nombre: 'Asiento', x: 40, y: 24 },
    { zona: 'manubrio', nombre: 'Manubrio', x: 59, y: 16 },
    { zona: 'frenos', nombre: 'Frenos', x: 62, y: 45 },
    { zona: 'cadena', nombre: 'Cadena', x: 39, y: 66 },
    { zona: 'rueda_trasera', nombre: 'Rueda trasera', x: 25, y: 77 },
    { zona: 'rueda_delantera', nombre: 'Rueda delantera', x: 75, y: 79 },
];

function parsePorcentaje(valor: unknown, campo: string): number {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0 || valor > 100) {
        throw new ApiError(`La coordenada ${campo} debe ser un número entre 0 y 100`, 400);
    }
    return Math.round(valor * 100) / 100;
}

function parseObjectId(id: unknown): ObjectId {
    if (typeof id !== 'string' || !ObjectId.isValid(id)) throw new ApiError('El id del punto no es válido', 400);
    return new ObjectId(id);
}

export function crearPuntosMantenimientoRoutes(db: Db): Router {
    const router = Router();
    const puntos = db.collection<PuntoDocument>(COLLECTIONS.maintenancePoints);
    const tareas = db.collection<{ _id?: ObjectId; zona: ZonaBicicleta; nombre: string }>(COLLECTIONS.maintenanceTasks);
    const toEntity = ({ _id, ...rest }: PuntoDocument): PuntoMantenimiento => ({ id: _id?.toString(), ...rest });

    router.get('/mantenimiento/puntos', verificarToken, requerirRol(['admin', 'tecnico']), async (_req, res) => {
        try {
            if (await puntos.countDocuments() === 0) {
                await puntos.insertMany(PUNTOS_POR_DEFECTO.map(punto => ({ ...punto })));
            }
            const [docsPuntos, docsTareas] = await Promise.all([puntos.find().toArray(), tareas.find().toArray()]);
            res.status(200).json(docsPuntos.map(doc => ({
                ...toEntity(doc),
                tareas: docsTareas
                    .filter(tarea => tarea.zona === doc.zona)
                    .map(({ _id, ...rest }): TareaMantenimiento => ({ id: _id?.toString(), ...rest })),
            })));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    });

    router.put('/mantenimiento/puntos', verificarToken, requerirRol(['admin', 'tecnico']), async (req, res) => {
        try {
            const entrada: unknown[] = Array.isArray(req.body?.puntos) ? req.body.puntos : [req.body];
            if (entrada.length === 0) throw new ApiError('Debe indicar al menos un punto', 400);
            const cambios = entrada.map((item: any) => ({
                _id: parseObjectId(item?.id),
                x: parsePorcentaje(item?.x, 'x'),
                y: parsePorcentaje(item?.y, 'y'),
            }));
            const result = await puntos.bulkWrite(cambios.map(({ _id, x, y }) => ({
                updateOne: { filter: { _id }, update: { $set: { x, y } } },
            })));
            if (result.matchedCount !== cambios.length) throw new ApiError('Algún punto indicado no existe', 404);
            res.status(200).json({ actualizados: result.matchedCount });
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    });

    router.post('/mantenimiento/puntos', verificarToken, requerirRol(['admin', 'tecnico']), async (req, res) => {
        try {
            const zona = req.body?.zona;
            const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
            if (!ZONAS_BICICLETA.includes(zona)) throw new ApiError('La zona de la bicicleta no es válida', 400);
            if (!nombre) throw new ApiError('El nombre del punto es obligatorio', 400);
            const punto = { zona, nombre, x: parsePorcentaje(req.body?.x, 'x'), y: parsePorcentaje(req.body?.y, 'y') };
            const result = await puntos.insertOne({ ...punto });
            res.status(201).json({ id: result.insertedId.toString(), ...punto });
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    });

    router.delete('/mantenimiento/puntos/:id', verificarToken, requerirRol(['admin', 'tecnico']), async (req, res) => {
        try {
            const result = await puntos.deleteOne({ _id: parseObjectId(req.params.id) });
            if (result.deletedCount === 0) throw new ApiError('Punto no encontrado', 404);
            res.status(204).send();
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    });

    return router;
}
