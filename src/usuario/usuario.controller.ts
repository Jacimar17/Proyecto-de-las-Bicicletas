import { Request, Response } from 'express';
import { errorMessage, errorStatus } from '../common/api-error';
import { UsuarioService } from './usuario.service';

export class UsuarioController {
    constructor(private readonly service: UsuarioService) {}

    register = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(201).json(await this.service.register(req.body));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await this.service.login(req.body?.dni, req.body?.password);
            res.status(200).json({ ...result.user, token: result.token, role: result.role });
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
