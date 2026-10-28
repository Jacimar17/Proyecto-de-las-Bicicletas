import { Usuario } from './usuario.entity';

export interface UsuarioRepository {
    findAll(): Promise<Usuario[]>;
    findById(id: string): Promise<Usuario | null>;
    findByDni(dni: string): Promise<Usuario | null>;
    findByEmail(email: string): Promise<Usuario | null>;
    create(usuario: Usuario): Promise<Usuario>;
    update(id: string, usuario: Partial<Usuario>): Promise<Usuario | null>;
    delete(id: string): Promise<boolean>;
    ensureIndexes(): Promise<void>;
}
