import { Request, Response } from 'express';
import { errorMessage, errorStatus } from '../common/api-error';
import { currentUser } from '../auth/auth.middleware';
import { UserService } from './user.service';

export class UserController {
    constructor(private readonly service: UserService) {}

    register = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.service.register(req.body));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.login(req.body));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    loginGoogle = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.loginGoogle(req.body));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    profile = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getById(currentUser(res).id));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    getAll = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getAll());
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    getById = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getById(req.params.id as string));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    create = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json({ user: await this.service.createByAdmin(req.body) });
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    update = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json({ user: await this.service.update(req.params.id as string, req.body) });
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    delete = async (req: Request, res: Response): Promise<void> => {
        try {
            await this.service.delete(req.params.id as string);
            res.status(204).send();
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };
}
