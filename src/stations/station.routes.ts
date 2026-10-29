import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { StationController } from './station.controller';

export class StationRoutes {
    public readonly router = Router();

    constructor(private readonly controller: StationController) {
        this.router.get('/', this.controller.getAll);
        this.router.get('/:id', this.controller.getById);
        this.router.post('/', authenticate, requireRole('admin'), this.controller.create);
        this.router.put('/:id', authenticate, requireRole('admin'), this.controller.update);
        this.router.delete('/:id', authenticate, requireRole('admin'), this.controller.delete);
    }
}
