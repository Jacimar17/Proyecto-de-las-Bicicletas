import { Router } from 'express';
import { ViajeController } from './viaje.controller';
import { requerirRol, verificarToken } from '../usuario/auth.middleware';

export class ViajeRoutes {
    public readonly router = Router();

    constructor(controller: ViajeController) {
        this.router.use(verificarToken, requerirRol('cliente'));
        this.router.get('/viajes', controller.getHistory);
        this.router.get('/viajes/activo', controller.getActive);
        this.router.post('/viajes', controller.start);
        this.router.patch('/viajes/activo/finalizar', controller.finish);
    }
}
