import { Router } from 'express';
import { ViajeController } from './viaje.controller';
import { requerirRol, verificarToken } from '../usuario/auth.middleware';

export class ViajeRoutes {
    public readonly router = Router();

    constructor(controller: ViajeController) {
        this.router.get('/viajes/mis-viajes', verificarToken, requerirRol('cliente'), controller.getLegacyHistory);
        this.router.get('/viajes', verificarToken, requerirRol('cliente'), controller.getHistory);
        this.router.get('/viajes/todos', verificarToken, requerirRol('admin'), controller.getAll);
        this.router.get('/viajes/activo', verificarToken, requerirRol('cliente'), controller.getActive);
        this.router.post('/viajes', verificarToken, requerirRol('cliente'), controller.start);
        this.router.patch('/viajes/activo/finalizar', verificarToken, requerirRol('cliente'), controller.finish);
        this.router.patch('/viajes/:id/devolver', verificarToken, requerirRol('cliente'), controller.finishLegacy);
    }
}
