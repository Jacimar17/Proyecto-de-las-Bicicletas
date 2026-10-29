import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { TripController } from './trip.controller';

export class TripRoutes {
    public readonly router = Router();

    constructor(controller: TripController) {
        this.router.get('/', authenticate, requireRole('cliente'), controller.getHistory);
        this.router.get(['/all', '/todos'], authenticate, requireRole('admin'), controller.getAll);
        this.router.get(['/active', '/activo'], authenticate, requireRole('cliente'), controller.getActive);
        this.router.post(
            ['/unlock-code', '/codigo-desbloqueo'],
            authenticate,
            requireRole('cliente'),
            controller.generateUnlockCode
        );
        this.router.post('/', authenticate, requireRole('cliente'), controller.start);
        this.router.patch(
            ['/active/finish', '/activo/finalizar'],
            authenticate,
            requireRole('cliente'),
            controller.finish
        );
    }
}
