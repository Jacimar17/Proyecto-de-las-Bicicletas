import { Db } from 'mongodb';
import { UsuarioRepository } from './usuario.repository.interface';

export class UsuarioRepositoryMongo implements UsuarioRepository {
    constructor(readonly db: Db) {}

    async findByDni(): Promise<null> {
        return null;
    }

    async findByEmail(): Promise<null> {
        return null;
    }

    async create(usuario: Parameters<UsuarioRepository['create']>[0]): Promise<typeof usuario> {
        return usuario;
    }
}
