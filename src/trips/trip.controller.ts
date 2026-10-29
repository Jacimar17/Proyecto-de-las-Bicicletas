import { Request, Response } from 'express';
import { errorMessage, errorStatus } from '../common/api-error';
import { currentUser } from '../auth/auth.middleware';
import { TripService } from './trip.service';

export class TripController {
    constructor(private readonly service: TripService) {}

    getHistory = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getHistory(currentUser(res).id));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getAll());
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

    generateUnlockCode = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.service.generateUnlockCode(
                currentUser(res).id,
                req.body?.bicicleta_id
            ));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    start = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.service.start(
                currentUser(res).id,
                req.body?.bicicleta_id,
                req.body?.estacion_origen_id,
                req.body?.codigo_desbloqueo
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
