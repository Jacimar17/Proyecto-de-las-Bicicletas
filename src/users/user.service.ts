import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { ApiError } from '../common/api-error';
import { PublicUser, User, UserRole } from './user.entity';
import { UserRepository } from './user.repository.interface';

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const VALID_ROLES: readonly string[] = ['admin', 'cliente', 'tecnico'];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function isDuplicateKey(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export interface GoogleProfile {
    googleId?: string;
    email?: string;
    emailVerified?: boolean;
    name?: string;
    familyName?: string;
}

export type GoogleVerifier = (credential: string) => Promise<GoogleProfile>;

const googleClient = new OAuth2Client();

async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
    const audience = process.env.GOOGLE_CLIENT_ID;
    if (!audience) throw new Error('GOOGLE_CLIENT_ID no está configurado');
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience });
    const payload = ticket.getPayload();
    return {
        googleId: payload?.sub,
        email: payload?.email,
        emailVerified: payload?.email_verified,
        name: payload?.name,
        familyName: payload?.family_name
    };
}

export class UserService {
    constructor(
        private readonly repository: UserRepository,
        private readonly verifyGoogle: GoogleVerifier = verifyGoogleCredential
    ) {}

    async register(data: unknown): Promise<PublicUser> {
        const body = isRecord(data) ? data : {};
        const nombre = text(body.nombre ?? body.name);
        const apellido = text(body.apellido ?? body.lastName);
        const email = text(body.email).toLowerCase();
        const dni = text(body.dni);
        const password = typeof body.password === 'string' ? body.password : '';

        if (!nombre || !email || !password) {
            throw new ApiError('Nombre, email y contraseña son obligatorios', 400);
        }
        if (!EMAIL_PATTERN.test(email)) throw new ApiError('El email no tiene un formato válido', 400);
        this.validatePassword(password);
        if (dni && await this.repository.findByDni(dni)) throw new ApiError('El DNI ya está registrado', 409);
        if (await this.repository.findByEmail(email)) throw new ApiError('El email ya está registrado', 409);

        try {
            const user = await this.repository.create({
                ...(dni ? { dni } : {}),
                nombre,
                apellido,
                email,
                password: await bcrypt.hash(password, 10),
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

    async createByAdmin(data: unknown): Promise<PublicUser> {
        const body = isRecord(data) ? data : {};
        const role = body.role;
        if (role !== undefined && (typeof role !== 'string' || !VALID_ROLES.includes(role))) {
            throw new ApiError('El rol no es válido', 400);
        }
        const created = await this.register(body);
        if (role === undefined && body.bloqueado === undefined) return created;
        const updated = await this.repository.update(created.id as string, {
            role: (role as UserRole | undefined) ?? 'cliente',
            bloqueado: body.bloqueado === true
        });
        if (!updated) throw new Error('No se pudo actualizar el usuario recién creado');
        return this.publicUser(updated);
    }

    async login(data: unknown): Promise<{ user: PublicUser; token: string; role: UserRole }> {
        const body = isRecord(data) ? data : {};
        const password = typeof body.password === 'string' ? body.password : '';
        const email = text(body.email).toLowerCase();
        const dni = text(body.dni);
        const nombre = text(body.nombre ?? body.name);
        if (!password || (!email && !dni && !nombre)) {
            throw new ApiError('Email, DNI o nombre y contraseña son obligatorios', 400);
        }

        const user = email
            ? await this.repository.findByEmail(email)
            : dni
                ? await this.repository.findByDni(dni)
                : await this.repository.findByName(nombre);
        if (!user?.password || !await bcrypt.compare(password, user.password)) {
            throw new ApiError('Credenciales incorrectas', 401);
        }
        return this.authenticated(user);
    }

    async loginGoogle(data: unknown): Promise<{ user: PublicUser; token: string; role: UserRole }> {
        const body = isRecord(data) ? data : {};
        const credential = typeof body.credential === 'string' ? body.credential : '';
        if (!credential) throw new ApiError('La credencial de Google es obligatoria', 400);

        let profile: GoogleProfile;
        try {
            profile = await this.verifyGoogle(credential);
        } catch {
            throw new ApiError('Credencial de Google no válida', 401);
        }
        if (!profile.googleId || !profile.email || !profile.emailVerified) {
            throw new ApiError('La cuenta de Google no tiene un email verificado', 401);
        }
        const email = profile.email.trim().toLowerCase();

        let user = await this.repository.findByGoogleId(profile.googleId);
        if (!user) {
            const existing = await this.repository.findByEmail(email);
            if (existing?.id) {
                user = await this.repository.update(existing.id, { googleId: profile.googleId });
            } else {
                user = await this.repository.create({
                    nombre: profile.name?.trim() || email.split('@')[0],
                    apellido: profile.familyName?.trim() ?? '',
                    email,
                    googleId: profile.googleId,
                    role: 'cliente',
                    puntuacion: 10,
                    suspendidoHasta: null,
                    bloqueado: false
                });
            }
        }
        if (!user) throw new ApiError('No se pudo vincular la cuenta de Google', 500);
        return this.authenticated(user);
    }

    async getAll(): Promise<PublicUser[]> {
        return (await this.repository.findAll()).map(user => this.publicUser(user));
    }

    async getById(id: string): Promise<PublicUser> {
        const user = await this.repository.findById(id);
        if (!user) throw new ApiError('Usuario no encontrado', 404);
        return this.publicUser(user);
    }

    async update(id: string, data: unknown): Promise<PublicUser> {
        const body = isRecord(data) ? data : {};
        if (!await this.repository.findById(id)) throw new ApiError('Usuario no encontrado', 404);

        const updates: Partial<Omit<User, 'id'>> = {};
        const nombreValue = body.nombre ?? body.name;
        if (nombreValue !== undefined) {
            const nombre = text(nombreValue);
            if (!nombre) throw new ApiError('El nombre es obligatorio', 400);
            updates.nombre = nombre;
        }
        const apellidoValue = body.apellido ?? body.lastName;
        if (apellidoValue !== undefined) updates.apellido = text(apellidoValue);
        if (body.dni !== undefined) {
            const dni = text(body.dni);
            if (!dni) throw new ApiError('El DNI es obligatorio', 400);
            const duplicate = await this.repository.findByDni(dni);
            if (duplicate && duplicate.id !== id) throw new ApiError('El DNI ya está registrado', 409);
            updates.dni = dni;
        }
        if (body.email !== undefined) {
            const email = text(body.email).toLowerCase();
            if (!EMAIL_PATTERN.test(email)) throw new ApiError('El email no tiene un formato válido', 400);
            const duplicate = await this.repository.findByEmail(email);
            if (duplicate && duplicate.id !== id) throw new ApiError('El email ya está registrado', 409);
            updates.email = email;
        }
        if (body.password !== undefined) {
            if (typeof body.password !== 'string') throw new ApiError('La contraseña no es válida', 400);
            this.validatePassword(body.password);
            updates.password = await bcrypt.hash(body.password, 10);
        }
        if (body.bloqueado !== undefined) updates.bloqueado = body.bloqueado === true;
        if (body.suspendidoHasta !== undefined) {
            updates.suspendidoHasta = body.suspendidoHasta ? new Date(String(body.suspendidoHasta)) : null;
        }
        if (body.role !== undefined) {
            if (typeof body.role !== 'string' || !VALID_ROLES.includes(body.role)) {
                throw new ApiError('El rol no es válido', 400);
            }
            updates.role = body.role as UserRole;
        }
        if (Object.keys(updates).length === 0) throw new ApiError('Debe enviar campos para actualizar', 400);

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

    private authenticated(user: User): { user: PublicUser; token: string; role: UserRole } {
        if (user.bloqueado) throw new ApiError('El usuario está bloqueado', 403);
        if (user.suspendidoHasta && user.suspendidoHasta.getTime() > Date.now()) {
            throw new ApiError('El usuario está suspendido', 403);
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET no está configurado');
        const role: UserRole = VALID_ROLES.includes(user.role) ? user.role : 'cliente';
        const token = jwt.sign(
            { id: user.id, nombre: user.nombre, email: user.email, role },
            secret,
            { expiresIn: '2h' }
        );
        return { user: this.publicUser(user), token, role };
    }

    private validatePassword(password: string): void {
        if (password.length < 6) throw new ApiError('La contraseña debe tener al menos 6 caracteres', 400);
    }

    private publicUser(user: User): PublicUser {
        return {
            id: user.id,
            dni: user.dni,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            bloqueado: user.bloqueado ?? false,
            role: user.role,
            puntuacion: user.puntuacion ?? 10,
            suspendidoHasta: user.suspendidoHasta ?? null
        };
    }

    private throwIfDuplicate(error: unknown): void {
        if (isDuplicateKey(error)) throw new ApiError('El DNI o email ya está registrado', 409);
    }
}
