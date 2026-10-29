import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiError } from '../common/api-error';
import { RolUsuario, Usuario } from './usuario.entity';
import { UsuarioRepository } from './usuario.repository.interface';

export type UsuarioPublico = Pick<
    Usuario,
    'id' | 'dni' | 'nombre' | 'email' | 'bloqueado' | 'role' | 'puntuacion' | 'suspendidoHasta'
>;

export class UsuarioService {
    constructor(private readonly repository: UsuarioRepository) {}

    async register(data: { dni: string; nombre: string; email: string; password: string }): Promise<UsuarioPublico> {
        this.validateRequired(data);
        this.validatePassword(data.password);
        const dni = data.dni.trim();
        const email = data.email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError('El email no tiene un formato válido', 400);
        if (await this.repository.findByDni(dni)) throw new ApiError('El DNI ya está registrado', 409);
        if (await this.repository.findByEmail(email)) throw new ApiError('El email ya está registrado', 409);

        try {
            const user = await this.repository.create({
                dni,
                nombre: data.nombre.trim(),
                name: data.nombre.trim(),
                lastName: '',
                email,
                password: await bcrypt.hash(data.password, 10),
                bloqueado: false,
                role: 'cliente',
                puntuacion: 10,
                suspendidoHasta: null
            });
            return this.publicUser(user);
        } catch (error) {
            this.throwIfDuplicate(error);
            throw error;
        }
    }

    async login(dni: string, password: string): Promise<{ user: UsuarioPublico; token: string; role: RolUsuario }> {
        if (!dni?.trim() || !password) throw new ApiError('DNI y contraseña son obligatorios', 400);
        const user = await this.repository.findByDni(dni.trim());
        if (!user || !await bcrypt.compare(password, user.password)) {
            throw new ApiError('Credenciales incorrectas', 401);
        }
        if (user.bloqueado) throw new ApiError('El usuario está bloqueado', 403);
        if (user.suspendidoHasta && user.suspendidoHasta.getTime() > Date.now()) {
            throw new ApiError('El usuario está suspendido', 403);
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET no está configurado');
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, email: user.email, role: user.role, accountCollection: 'users' },
            secret,
            { expiresIn: '2h' }
        );
        return { user: this.publicUser(user), token, role: user.role };
    }

    async getAll(): Promise<UsuarioPublico[]> {
        return (await this.repository.findAll()).map(user => this.publicUser(user));
    }

    async getById(id: string): Promise<UsuarioPublico> {
        const user = await this.repository.findById(id);
        if (!user) throw new ApiError('Usuario no encontrado', 404);
        return this.publicUser(user);
    }

    async createByAdmin(data: {
        dni: string; nombre: string; email: string; password: string; role?: RolUsuario; bloqueado?: boolean;
    }): Promise<UsuarioPublico> {
        if (data.role !== undefined && data.role !== 'admin' && data.role !== 'cliente' && data.role !== 'tecnico') {
            throw new ApiError('El rol no es válido', 400);
        }
        const user = await this.register(data);
        if (data.role === undefined && data.bloqueado === undefined) return user;
        const saved = await this.repository.findByDni(data.dni.trim());
        if (!saved?.id) throw new Error('No se pudo recuperar el usuario recién creado');
        const updated = await this.repository.update(saved.id, {
            role: data.role ?? 'cliente',
            bloqueado: data.bloqueado ?? false
        });
        if (!updated) throw new Error('No se pudo actualizar el usuario recién creado');
        return this.publicUser(updated);
    }

    async update(id: string, data: Partial<Usuario>): Promise<UsuarioPublico> {
        const existing = await this.repository.findById(id);
        if (!existing) throw new ApiError('Usuario no encontrado', 404);

        const updates: Partial<Usuario> = {};
        if (data.dni !== undefined) {
            if (!data.dni.trim()) throw new ApiError('El DNI es obligatorio', 400);
            const dni = data.dni.trim();
            const duplicate = await this.repository.findByDni(dni);
            if (duplicate && duplicate.id !== id) throw new ApiError('El DNI ya está registrado', 409);
            updates.dni = dni;
        }
        if (data.nombre !== undefined) {
            if (!data.nombre.trim()) throw new ApiError('El nombre es obligatorio', 400);
            updates.nombre = data.nombre.trim();
        }
        if (data.email !== undefined) {
            const email = data.email.trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError('El email no tiene un formato válido', 400);
            const duplicate = await this.repository.findByEmail(email);
            if (duplicate && duplicate.id !== id) throw new ApiError('El email ya está registrado', 409);
            updates.email = email;
        }
        if (data.password !== undefined) {
            this.validatePassword(data.password);
            updates.password = await bcrypt.hash(data.password, 10);
        }
        if (data.bloqueado !== undefined) updates.bloqueado = data.bloqueado;
        if (data.suspendidoHasta !== undefined) updates.suspendidoHasta = data.suspendidoHasta;
        if (data.role !== undefined) {
            if (data.role !== 'admin' && data.role !== 'cliente' && data.role !== 'tecnico') {
                throw new ApiError('El rol no es válido', 400);
            }
            updates.role = data.role;
        }
        try {
            const updated = await this.repository.update(id, updates);
            if (!updated) throw new ApiError('Usuario no encontrado', 404);
            return this.publicUser(updated);
        } catch (error) {
            this.throwIfDuplicate(error);
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        if (!await this.repository.delete(id)) throw new ApiError('Usuario no encontrado', 404);
    }

    private validateRequired(data: { dni: string; nombre: string; email: string; password: string }): void {
        if (!data.dni?.trim() || !data.nombre?.trim() || !data.email?.trim() || !data.password) {
            throw new ApiError('DNI, nombre, email y contraseña son obligatorios', 400);
        }
    }

    private validatePassword(password: string): void {
        if (password.length < 6) throw new ApiError('La contraseña debe tener al menos 6 caracteres', 400);
    }

    private publicUser(user: Usuario): UsuarioPublico {
        return {
            id: user.id,
            dni: user.dni,
            nombre: user.nombre,
            email: user.email,
            bloqueado: user.bloqueado,
            role: user.role,
            puntuacion: user.puntuacion ?? 10,
            suspendidoHasta: user.suspendidoHasta ?? null
        };
    }

    private throwIfDuplicate(error: unknown): void {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
            throw new ApiError('El DNI o email ya está registrado', 409);
        }
    }
}
