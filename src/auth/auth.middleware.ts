import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../common/api-error';
import { UserRole } from '../users/user.entity';

export interface AuthenticatedUser {
    id: string;
    nombre: string;
    email?: string;
    role: UserRole;
}

const VALID_ROLES: readonly string[] = ['admin', 'cliente', 'tecnico'];

export function authenticate(req: Request, res: Response, next: NextFunction): void {
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
        if (typeof payload === 'string' || typeof payload.id !== 'string' || !VALID_ROLES.includes(payload.role)) {
            res.status(401).json({ message: 'Token inválido o expirado' });
            return;
        }
        const nombre = typeof payload.nombre === 'string' ? payload.nombre : '';
        res.locals.user = {
            id: payload.id,
            nombre,
            email: typeof payload.email === 'string' ? payload.email : undefined,
            role: payload.role as UserRole
        } satisfies AuthenticatedUser;
        next();
    } catch {
        res.status(401).json({ message: 'Token inválido o expirado' });
    }
}

export function requireRole(...roles: UserRole[]) {
    return (_req: Request, res: Response, next: NextFunction): void => {
        const user = res.locals.user as AuthenticatedUser | undefined;
        if (!user) {
            res.status(401).json({ message: 'Token no proporcionado' });
            return;
        }
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
