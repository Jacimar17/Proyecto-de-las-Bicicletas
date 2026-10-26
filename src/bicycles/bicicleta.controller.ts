import { Request, Response } from 'express';
import { BicicletaService } from './bicicleta.service';

export class BicicletaController {
    constructor(private readonly service: BicicletaService) {}

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getAll());
        } catch {
            res.status(500).json({ message: 'Error al obtener las bicicletas' });
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.service.create(req.body));
        } catch (error) {
            res.status(this.statusFor(error)).json({ message: (error as Error).message });
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.update(req.params.id as string, req.body));
        } catch (error) {
            res.status(this.statusFor(error)).json({ message: (error as Error).message });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.service.delete(req.params.id as string);
            res.status(204).send();
        } catch (error) {
            res.status(this.statusFor(error)).json({ message: (error as Error).message });
        }
    };

    private statusFor(error: unknown): number {
        const message = (error as Error).message;
        return message === 'Bicicleta no encontrada' ? 404 :
            message.includes('Ya existe') ? 409 : 400;
    }
}
