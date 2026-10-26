import { Request, Response } from 'express';
import { errorMessage, errorStatus } from '../common/api-error';
import { currentUser } from '../usuario/auth.middleware';
import { ViajeService } from './viaje.service';

export class ViajeController {
    constructor(private readonly service: ViajeService) {}

    getHistory = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getHistory(currentUser(res).id));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    getActive = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getActive(currentUser(res).id));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    start = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = currentUser(res);
            res.status(201).json(await this.service.start(
                user.id,
                req.body?.bicicleta_id,
                req.body?.estacion_origen_id
            ));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    finish = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.finish(
                currentUser(res).id,
                req.body?.estacion_destino_id
            ));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };
}
