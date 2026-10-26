import { Request, Response } from 'express';
import { errorMessage, errorStatus } from '../common/api-error';
import { AuthenticatedUser, currentUser } from '../usuario/auth.middleware';
import { MantenimientoService } from './mantenimiento.service';

export class MantenimientoController {
    constructor(private readonly service: MantenimientoService) {}

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getAll());
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    updateEstado = async (req: Request, res: Response): Promise<void> => {
        try {
            const tecnico: AuthenticatedUser = currentUser(res);
            res.status(201).json(await this.service.updateEstado(
                req.body?.bicicleta_id,
                req.body?.estado,
                tecnico
            ));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };
}
