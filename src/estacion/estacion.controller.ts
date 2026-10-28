import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Estacion } from './estacion.entity';
import { EstacionService, EstacionNoEncontradaError } from './estacion.service';

function requestId(req: Request): string | null {
    return typeof req.params.id === 'string' ? req.params.id : null;
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export class EstacionController {

    constructor(private readonly service: EstacionService) {}

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            const estaciones = await this.service.getAll();
            res.status(200).json(estaciones);
        } catch (error) {
            res.status(500).json({ message: message(error) });
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        const id = requestId(req);
        if (!id || !ObjectId.isValid(id)) {
            res.status(400).json({ message: 'ID de estación no válido' });
            return;
        }
        try {
            const estacion = await this.service.getById(id);
            res.status(200).json(estacion);
        } catch (error) {
            const status = error instanceof EstacionNoEncontradaError ? 404 : 500;
            res.status(status).json({ message: message(error) });
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const estacion = await this.service.create(req.body);
            res.status(201).json(estacion);
        } catch (error) {
            res.status(400).json({ message: message(error) });
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        const id = requestId(req);
        if (!id || !ObjectId.isValid(id)) {
            res.status(400).json({ message: 'ID de estación no válido' });
            return;
        }
        const updates: Partial<Estacion> = {};
        for (const field of ['nombre', 'barrio', 'direccion'] as const) {
            const value: unknown = req.body[field];
            if (value !== undefined) {
                if (typeof value !== 'string') {
                    res.status(400).json({ message: `El campo ${field} debe ser texto` });
                    return;
                }
                updates[field] = value;
            }
        }
        if (req.body.capacidad !== undefined) {
            const capacidad: unknown = req.body.capacidad;
            if (typeof capacidad !== 'number' || !Number.isInteger(capacidad)) {
                res.status(400).json({ message: 'La capacidad debe ser un número entero' });
                return;
            }
            updates.capacidad = capacidad;
        }
        for (const field of ['lat', 'lng'] as const) {
            const value: unknown = req.body[field];
            if (value !== undefined) {
                if (typeof value !== 'number' || !Number.isFinite(value)) {
                    res.status(400).json({ message: `El campo ${field} debe ser un número` });
                    return;
                }
                updates[field] = value;
            }
        }
        if (req.body.activa !== undefined) {
            const activa: unknown = req.body.activa;
            if (typeof activa !== 'boolean') {
                res.status(400).json({ message: 'El campo activa debe ser booleano' });
                return;
            }
            updates.activa = activa;
        }
        try {
            const estacion = await this.service.update(id, updates);
            res.status(200).json(estacion);
        } catch (error) {
            const status = error instanceof EstacionNoEncontradaError ? 404 : 400;
            res.status(status).json({ message: message(error) });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        const id = requestId(req);
        if (!id || !ObjectId.isValid(id)) {
            res.status(400).json({ message: 'ID de estación no válido' });
            return;
        }
        try {
            await this.service.delete(id);
            res.status(204).send();
        } catch (error) {
            const status = error instanceof EstacionNoEncontradaError ? 404 : 500;
            res.status(status).json({ message: message(error) });
        }
    };
}
