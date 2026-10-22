import { UsuarioService } from './usuario.service';

export class UsuarioController {
    constructor(readonly service: UsuarioService) {}
}
