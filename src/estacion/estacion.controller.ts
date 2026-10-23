import { Request, Response } from 'express';
import { EstacionService } from './estacion.service';

export class EstacionController {

    constructor(private readonly service: EstacionService) {}

    getAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const estaciones = await this.service.getAll();
            res.status(200).json(estaciones);
        } catch (error) {
            res.status(500).json({ message: (error as Error).message });
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            const estacion = await this.service.getById(req.params.id as string);
            res.status(200).json(estacion);
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        try {
            const estacion = await this.service.create(req.body);
            res.status(201).json(estacion);
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        try {
            const estacion = await this.service.update(req.params.id as string, req.body);
            res.status(200).json(estacion);
        } catch (error) {
            res.status(400).json({ message: (error as Error).message });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.service.delete(req.params.id as string);
            res.status(204).send();
        } catch (error) {
            res.status(404).json({ message: (error as Error).message });
        }
    };
}
