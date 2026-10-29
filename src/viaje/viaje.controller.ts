import { Request, Response } from 'express';
import { errorMessage, errorStatus } from '../common/api-error';
import { currentUser } from '../usuario/auth.middleware';
import { Viaje } from './viaje.entity';
import { ViajeService } from './viaje.service';

function legacyTrip(viaje: Viaje) {
    return {
        id: viaje.id,
        usuarioId: viaje.usuario_id,
        bicicletaId: viaje.bicicleta_id,
        estacionOrigenId: viaje.estacion_origen_id,
        estacionDestinoId: viaje.estacion_destino_id,
        fechaInicio: viaje.fecha_inicio,
        fechaFin: viaje.fecha_fin
    };
}

export class ViajeController {
    constructor(private readonly service: ViajeService) {}

    getHistory = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getHistory(currentUser(res).id));
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

    getLegacyHistory = async (_req: Request, res: Response): Promise<void> => {
        try {
            const user = currentUser(res);
            const history = await this.service.getHistory(user.id);
            res.status(200).json(history.map(legacyTrip));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    getActive = async (_req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.getActive(currentUser(res).id));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    generateUnlockCode = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = currentUser(res);
            const bicicletaId = req.body?.bicicleta_id ?? req.body?.bicicletaId;
            res.status(201).json(await this.service.generateUnlockCode(
                user.id,
                bicicletaId,
                user.accountCollection
            ));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    start = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = currentUser(res);
            const legacyRequest = typeof req.body?.bicicletaId === 'string';
            const viaje = await this.service.start(
                user.id,
                req.body?.bicicleta_id ?? req.body?.bicicletaId,
                req.body?.estacion_origen_id,
                user.accountCollection,
                req.body?.codigo_desbloqueo ?? req.body?.codigoDesbloqueo
            );
            res.status(201).json(legacyRequest
                ? { message: 'Viaje iniciado', data: legacyTrip(viaje) }
                : viaje);
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    finish = async (req: Request, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.service.finish(
                currentUser(res).id,
                req.body?.estacion_destino_id,
                currentUser(res).accountCollection
            ));
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };

    finishLegacy = async (req: Request, res: Response): Promise<void> => {
        try {
            const user = currentUser(res);
            const active = await this.service.getActive(user.id);
            if (!active || active.id !== req.params.id) {
                res.status(404).json({ message: 'No se encontró un viaje activo para este usuario' });
                return;
            }
            const viaje = await this.service.finish(
                user.id,
                req.body?.estacionDestinoId,
                user.accountCollection
            );
            res.status(200).json({
                message: 'Bicicleta devuelta; viaje finalizado',
                data: legacyTrip(viaje),
                puntuacion: viaje.puntuacion,
                suspendidoHasta: viaje.suspendidoHasta,
                bloqueado: viaje.bloqueado
            });
        } catch (error) {
            res.status(errorStatus(error)).json({ message: errorMessage(error) });
        }
    };
}
