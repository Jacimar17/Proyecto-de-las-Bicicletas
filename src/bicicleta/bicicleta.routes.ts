import { Router } from 'express';
import { BicicletaController } from './bicicleta.controller';

export class BicicletaRoutes {
    public readonly router = Router();

    constructor(readonly controller: BicicletaController) {}
}
