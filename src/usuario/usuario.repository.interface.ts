import { Usuario } from './usuario.entity';

export interface UsuarioRepository {
    findByDni(dni: string): Promise<Usuario | null>;
    findByEmail(email: string): Promise<Usuario | null>;
    create(usuario: Usuario): Promise<Usuario>;
}
