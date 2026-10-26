import { Router } from 'express';
import { requerirRol, verificarToken } from '../usuario/auth.middleware';
import { MantenimientoController } from './mantenimiento.controller';

export class MantenimientoRoutes {
    public readonly router = Router();

    constructor(controller: MantenimientoController) {
        this.router.get('/mantenimientos', verificarToken, requerirRol(['admin', 'tecnico']), controller.getAll);
        this.router.post('/mantenimientos', verificarToken, requerirRol('tecnico'), controller.updateEstado);
    }
}
