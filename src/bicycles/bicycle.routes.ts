import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { BicycleController } from './bicycle.controller';

export class BicycleRoutes {
    public readonly router = Router();

    constructor(private readonly controller: BicycleController) {
        this.router.get('/', this.controller.getAll);
        this.router.post('/', authenticate, requireRole('admin'), this.controller.create);
        this.router.put('/:id', authenticate, requireRole('admin'), this.controller.update);
        this.router.delete('/:id', authenticate, requireRole('admin'), this.controller.delete);
    }
}
