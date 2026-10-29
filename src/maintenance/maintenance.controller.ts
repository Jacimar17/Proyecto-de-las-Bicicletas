import { Request, Response } from 'express';
import { errorMessage, errorStatus } from '../common/api-error';
import { currentUser } from '../auth/auth.middleware';
import { MaintenanceService } from './maintenance.service';

export class MaintenanceController {
    constructor(private readonly service: MaintenanceService) {}

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getAll());
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    updateStatus = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.service.updateStatus(
                req.body?.bicicleta_id,
                req.body?.estado,
                currentUser(res),
                { estacion_id: req.body?.estacion_id, tareas: req.body?.tareas }
            ));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };
}
