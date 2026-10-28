import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../common/api-error';
import { RolUsuario } from './usuario.entity';

export interface AuthenticatedUser {
    id: string;
    nombre: string;
    email?: string;
    role: RolUsuario;
    accountCollection?: 'users' | 'usuarios';
}

export function verificarToken(req: Request, res: Response, next: NextFunction): void {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Token no proporcionado' });
        return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        next(new Error('JWT_SECRET no está configurado'));
        return;
    }

    try {
        const payload = jwt.verify(authorization.slice(7), secret);
        const nombre =
            typeof payload !== 'string' && typeof payload.nombre === 'string'
                ? payload.nombre
                : typeof payload !== 'string' && typeof payload.name === 'string'
                    ? payload.name
                    : null;
        if (typeof payload === 'string' || typeof payload.id !== 'string' ||
            !nombre ||
            (payload.role !== 'admin' && payload.role !== 'cliente' && payload.role !== 'tecnico')) {
            res.status(401).json({ message: 'Token inválido o expirado' });
            return;
        }
        res.locals.user = {
            id: payload.id,
            nombre,
            email: typeof payload.email === 'string' ? payload.email : undefined,
            role: payload.role,
            accountCollection:
                payload.accountCollection === 'users' || payload.accountCollection === 'usuarios'
                    ? payload.accountCollection
                    : undefined
        } satisfies AuthenticatedUser;
        next();
    } catch {
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

export function requerirRol(role: RolUsuario | RolUsuario[]) {
    return (_req: Request, res: Response, next: NextFunction): void => {
        const user = res.locals.user as AuthenticatedUser | undefined;
        if (!user) {
            res.status(401).json({ message: 'Token no proporcionado' });
            return;
        }
        const roles = Array.isArray(role) ? role : [role];
        if (!roles.includes(user.role)) {
            res.status(403).json({ message: 'Acceso denegado' });
            return;
        }
        next();
    };
}

export function currentUser(res: Response): AuthenticatedUser {
    const user = res.locals.user as AuthenticatedUser | undefined;
    if (!user) throw new ApiError('Token no proporcionado', 401);
    return user;
}
