import { UsuarioRepository } from './usuario.repository.interface';

export class UsuarioService {
    constructor(readonly repository: UsuarioRepository) {}
}
