import { Router } from 'express';
import { UsuarioController } from './usuario.controller';

export class UsuarioRoutes {
    public readonly router = Router();

    constructor(readonly controller: UsuarioController) {}
}
