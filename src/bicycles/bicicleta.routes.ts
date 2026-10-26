import { Router } from 'express';
import { BicicletaController } from './bicicleta.controller';
import { requerirRol, verificarToken } from '../usuario/auth.middleware';

export class BicicletaRoutes {
    public readonly router = Router();

    constructor(private readonly controller: BicicletaController) {
        this.router.get('/bicicletas', this.controller.getAll);
        this.router.post('/bicicleta', verificarToken, requerirRol('admin'), this.controller.create);
        this.router.put('/bicicleta/:id', verificarToken, requerirRol('admin'), this.controller.update);
        this.router.delete('/bicicleta/:id', verificarToken, requerirRol('admin'), this.controller.delete);
    }
}
