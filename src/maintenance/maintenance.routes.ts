import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { MaintenanceController } from './maintenance.controller';

export class MaintenanceRoutes {
    public readonly router = Router();

    constructor(controller: MaintenanceController) {
        this.router.get('/', authenticate, requireRole('admin', 'tecnico'), controller.getAll);
        this.router.post('/', authenticate, requireRole('admin', 'tecnico'), controller.updateStatus);
    }
}
