import { Router } from 'express';
import { authenticate, requireRole } from '../auth/auth.middleware';
import { UserController } from './user.controller';

export class UserRoutes {
    public readonly router = Router();

    constructor(private readonly controller: UserController) {
        this.router.post('/login', this.controller.login);
        this.router.post('/login/google', this.controller.loginGoogle);
        this.router.post(['/register', '/registro'], this.controller.register);
        this.router.get(['/profile', '/perfil'], authenticate, this.controller.profile);
        this.router.get('/', authenticate, requireRole('admin'), this.controller.getAll);
        this.router.post('/', authenticate, requireRole('admin'), this.controller.create);
        this.router.get('/:id', authenticate, requireRole('admin'), this.controller.getById);
        this.router.put('/:id', authenticate, requireRole('admin'), this.controller.update);
        this.router.delete('/:id', authenticate, requireRole('admin'), this.controller.delete);
    }
}
