import { ApiError } from '../common/api-error';
import { BicicletaRepository } from '../bicycles/bicicleta.repository.interface';
import { EstacionRepository } from '../estacion/estacion.repository.interface';
import { UserRepository } from '../users/user.repository.interface';
import { UsuarioRepository } from '../usuario/usuario.repository.interface';
import { Viaje } from './viaje.entity';
import { ViajeRepository } from './viaje.repository.interface';

const MAX_SCORE = 10;
const MIN_SCORE = 1;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

type AccountCollection = 'users' | 'usuarios';
type AccountSnapshot = {
    puntuacion: number;
    suspendidoHasta: Date | null;
    bloqueado: boolean;
    update: (data: { puntuacion: number; suspendidoHasta: Date | null; bloqueado: boolean }) => Promise<boolean>;
};

export class ViajeService {
    constructor(
        private readonly repository: ViajeRepository,
        private readonly bicicletaRepository: BicicletaRepository,
        private readonly estacionRepository: EstacionRepository,
        private readonly usuarioRepository: UsuarioRepository,
        private readonly userRepository: UserRepository
    ) {}

    async getHistory(usuarioId: string): Promise<Viaje[]> {
        return this.repository.findHistoryByUser(usuarioId);
    }

    async getActive(usuarioId: string): Promise<Viaje | null> {
        return this.repository.findActiveByUser(usuarioId);
    }

    async start(
        usuarioId: string,
        bicicletaId: string,
        estacionOrigenId?: string,
        accountCollection?: AccountCollection,
        unlockCode?: string
    ): Promise<Viaje> {
        if (typeof bicicletaId !== 'string' || !bicicletaId.trim()) {
            throw new ApiError('La bicicleta es obligatoria', 400);
        }
        if (typeof unlockCode !== 'string' || !unlockCode.trim()) {
            throw new ApiError('El código de desbloqueo es obligatorio', 400);
        }
        const account = await this.findAccount(usuarioId, accountCollection);
        if (!account) throw new ApiError('Usuario no encontrado', 404);
        if (account.bloqueado) throw new ApiError('La cuenta está bloqueada', 403);
        if (account.suspendidoHasta && account.suspendidoHasta.getTime() > Date.now()) {
            throw new ApiError('La cuenta está suspendida', 403);
        }
        if (await this.repository.findActiveByUser(usuarioId)) {
            throw new ApiError('Ya tienes un viaje en curso', 409);
        }

        const bicicleta = await this.bicicletaRepository.findById(bicicletaId);
        if (!bicicleta) throw new ApiError('Bicicleta no encontrada', 404);
        const originId = estacionOrigenId || bicicleta.estacion_id;
        if (!originId?.trim()) throw new ApiError('La estación de origen es obligatoria', 400);
        const estacion = await this.estacionRepository.findById(originId);
        if (!estacion) throw new ApiError('Estación no encontrada', 404);
        if (!estacion.activa) throw new ApiError('La estación no está habilitada', 400);
        if (bicicleta.estacion_id !== originId) {
            throw new ApiError('La bicicleta no pertenece a la estación seleccionada', 400);
        }

        const expectedCode = (bicicleta.unlockCode ?? bicicleta.codigo).trim();
        if (unlockCode.trim() !== expectedCode) {
            throw new ApiError('El código de desbloqueo no es correcto', 403);
        }

        const actualizada = await this.bicicletaRepository.updateIfEstado(
            bicicletaId,
            'DISPONIBLE',
            { estado: 'EN_USO', estacion_id: null }
        );
        if (!actualizada) throw new ApiError('La bicicleta ya no está disponible', 409);

        try {
            return await this.repository.create({
                usuario_id: usuarioId,
                bicicleta_id: bicicletaId,
                estacion_origen_id: originId,
                estacion_destino_id: null,
                fecha_inicio: new Date(),
                fecha_fin: null
            });
        } catch (error) {
            const restored = await this.bicicletaRepository.updateIfEstado(
                bicicletaId,
                'EN_USO',
                { estado: 'DISPONIBLE', estacion_id: originId }
            );
            if (!restored) throw new Error('No se pudo guardar el viaje ni restaurar la bicicleta');
            throw error;
        }
    }

    async finish(
        usuarioId: string,
        estacionDestinoId: string,
        accountCollection?: AccountCollection
    ): Promise<Viaje & { puntuacion: number; suspendidoHasta: Date | null; bloqueado: boolean }> {
        if (typeof estacionDestinoId !== 'string' || !estacionDestinoId.trim()) {
            throw new ApiError('La estación de destino es obligatoria', 400);
        }
        const account = await this.findAccount(usuarioId, accountCollection);
        if (!account) throw new ApiError('Usuario no encontrado', 404);
        const viaje = await this.repository.findActiveByUser(usuarioId);
        if (!viaje?.id) throw new ApiError('No tienes un viaje en curso', 404);

        const [estacion, bicicleta] = await Promise.all([
            this.estacionRepository.findById(estacionDestinoId),
            this.bicicletaRepository.findById(viaje.bicicleta_id)
        ]);
        if (!estacion) throw new ApiError('Estación no encontrada', 404);
        if (!estacion.activa) throw new ApiError('La estación no está habilitada', 400);
        if (!bicicleta) throw new ApiError('Bicicleta no encontrada', 404);

        const actualizada = await this.bicicletaRepository.updateIfEstado(
            viaje.bicicleta_id,
            'EN_USO',
            { estado: 'DISPONIBLE', estacion_id: estacionDestinoId, ubicacion: estacion.nombre }
        );
        if (!actualizada) throw new ApiError('No se pudo devolver la bicicleta', 409);

        const finishedAt = new Date();
        let tripFinalized = false;
        try {
            const finalizado = await this.repository.finish(viaje.id, usuarioId, estacionDestinoId, finishedAt);
            if (!finalizado) throw new ApiError('El viaje ya fue finalizado', 409);
            tripFinalized = true;
            const startedAt = new Date(viaje.fecha_inicio);
            if (!Number.isFinite(startedAt.getTime()) || finishedAt.getTime() < startedAt.getTime()) {
                throw new Error('Las fechas del viaje no permiten calcular la puntuación');
            }
            const currentScore =
                typeof account.puntuacion === 'number' && Number.isInteger(account.puntuacion)
                    ? Math.max(MIN_SCORE, Math.min(MAX_SCORE, account.puntuacion))
                    : MAX_SCORE;
            const newScore =
                finishedAt.getTime() - startedAt.getTime() <= THREE_HOURS_MS
                    ? Math.min(MAX_SCORE, currentScore + 1)
                    : Math.max(MIN_SCORE, currentScore - 1);
            const suspensionDays: Record<number, number> = { 4: 1, 3: 2, 2: 3 };
            const suspendedUntil = suspensionDays[newScore]
                ? new Date(finishedAt.getTime() + suspensionDays[newScore] * DAY_MS)
                : account.suspendidoHasta && account.suspendidoHasta.getTime() > finishedAt.getTime()
                    ? account.suspendidoHasta
                    : null;
            const blocked = newScore === MIN_SCORE || account.bloqueado;
            if (!(await account.update({
                puntuacion: newScore,
                suspendidoHasta: suspendedUntil,
                bloqueado: blocked
            }))) {
                throw new Error('El viaje finalizó, pero no se pudo actualizar la puntuación del usuario');
            }
            return {
                ...finalizado,
                puntuacion: newScore,
                suspendidoHasta: suspendedUntil,
                bloqueado: blocked
            };
        } catch (error) {
            if (!tripFinalized) {
                const restored = await this.bicicletaRepository.updateIfEstado(
                    viaje.bicicleta_id,
                    'DISPONIBLE',
                    { estado: 'EN_USO', estacion_id: null, ubicacion: bicicleta.ubicacion }
                );
                if (!restored) throw new Error('No se pudo finalizar el viaje ni restaurar la bicicleta');
            }
            throw error;
        }
    }

    private async findAccount(id: string, preferred?: AccountCollection): Promise<AccountSnapshot | null> {
        if (preferred === 'users') {
            const account = await this.userRepository.findById(id);
            if (!account) return null;
            return {
                puntuacion: account.puntuacion ?? MAX_SCORE,
                suspendidoHasta: account.suspendidoHasta ?? null,
                bloqueado: account.bloqueado ?? false,
                update: async (data) => Boolean(await this.userRepository.update(id, data))
            };
        }
        if (preferred === 'usuarios') {
            const account = await this.usuarioRepository.findById(id);
            if (!account) return null;
            return {
                puntuacion: account.puntuacion ?? MAX_SCORE,
                suspendidoHasta: account.suspendidoHasta ?? null,
                bloqueado: account.bloqueado ?? false,
                update: async (data) => Boolean(await this.usuarioRepository.update(id, data))
            };
        }

        const legacyAccount = await this.userRepository.findById(id);
        if (legacyAccount) {
            return {
                puntuacion: legacyAccount.puntuacion ?? MAX_SCORE,
                suspendidoHasta: legacyAccount.suspendidoHasta ?? null,
                bloqueado: legacyAccount.bloqueado ?? false,
                update: async (data) => Boolean(await this.userRepository.update(id, data))
            };
        }
        const account = await this.usuarioRepository.findById(id);
        if (!account) return null;
        return {
            puntuacion: account.puntuacion ?? MAX_SCORE,
            suspendidoHasta: account.suspendidoHasta ?? null,
            bloqueado: account.bloqueado ?? false,
            update: async (data) => Boolean(await this.usuarioRepository.update(id, data))
        };
    }
}
