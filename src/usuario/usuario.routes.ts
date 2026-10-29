import { Router } from 'express';
import { UsuarioController } from './usuario.controller';
import { requerirRol, verificarToken } from './auth.middleware';

export class UsuarioRoutes {
    public readonly router = Router();

    constructor(private readonly controller: UsuarioController) {
        this.router.post('/usuario/login', this.controller.login);
        this.router.post('/usuario/registro', this.controller.register);
        this.router.get('/usuario/perfil', verificarToken, this.controller.profile);
        this.router.get('/usuario', verificarToken, requerirRol('admin'), this.controller.getAll);
        this.router.post('/usuario', verificarToken, requerirRol('admin'), this.controller.create);
        this.router.get('/usuario/:id', verificarToken, requerirRol('admin'), this.controller.getById);
        this.router.put('/usuario/:id', verificarToken, requerirRol('admin'), this.controller.update);
        this.router.delete('/usuario/:id', verificarToken, requerirRol('admin'), this.controller.delete);
    }
}
