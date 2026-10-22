import { Router } from 'express';
import { BicicletaController } from './bicicleta.controller';

export class BicicletaRoutes {
    public readonly router = Router();

    constructor(private readonly controller: BicicletaController) {
        this.router.get('/bicicletas', this.controller.getAll);
        this.router.post('/bicicleta', this.controller.create);
        this.router.put('/bicicleta/:id', this.controller.update);
        this.router.delete('/bicicleta/:id', this.controller.delete);
    }
}
