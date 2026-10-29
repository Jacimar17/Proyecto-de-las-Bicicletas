import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { Station } from './station.entity';
import { StationNotFoundError, StationService } from './station.service';

function requestId(req: Request): string | null {
    return typeof req.params.id === 'string' ? req.params.id : null;
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

export class StationController {
    constructor(private readonly service: StationService) {}

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getAll());
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
            res.status(200).json(await this.service.getById(id));
        } catch (error) {
            const status = error instanceof StationNotFoundError ? 404 : 500;
            res.status(status).json({ message: message(error) });
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.service.create(req.body));
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
        const updates: Partial<Station> = {};
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
            const capacity: unknown = req.body.capacidad;
            if (typeof capacity !== 'number' || !Number.isInteger(capacity)) {
                res.status(400).json({ message: 'La capacidad debe ser un número entero' });
                return;
            }
            updates.capacidad = capacity;
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
            const active: unknown = req.body.activa;
            if (typeof active !== 'boolean') {
                res.status(400).json({ message: 'El campo activa debe ser booleano' });
                return;
            }
            updates.activa = active;
        }
        try {
            res.status(200).json(await this.service.update(id, updates));
        } catch (error) {
            const status = error instanceof StationNotFoundError ? 404 : 400;
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
            const status = error instanceof StationNotFoundError ? 404 : 500;
            res.status(status).json({ message: message(error) });
        }
    };
}
