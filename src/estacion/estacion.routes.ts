import { Router } from 'express';
import { EstacionController } from './estacion.controller';

export class EstacionRoutes {

    public readonly router: Router;

    constructor(private readonly controller: EstacionController) {
        this.router = Router();
        this.routes();
    }

    private routes(): void {
        this.router.get('/estaciones', this.controller.getAll);
        this.router.get('/estacion/:id', this.controller.getById);
        this.router.post('/estacion', this.controller.create);
        this.router.put('/estacion/:id', this.controller.update);
        this.router.delete('/estacion/:id', this.controller.delete);
    }
}
