import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../common/api-error';
import { RolUsuario } from './usuario.entity';

export interface AuthenticatedUser {
    id: string;
    nombre: string;
    role: RolUsuario;
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
        if (typeof payload === 'string' || typeof payload.id !== 'string' ||
            typeof payload.nombre !== 'string' ||
            (payload.role !== 'admin' && payload.role !== 'cliente' && payload.role !== 'tecnico')) {
            res.status(401).json({ message: 'Token inválido o expirado' });
            return;
        }
        res.locals.user = payload as AuthenticatedUser;
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
