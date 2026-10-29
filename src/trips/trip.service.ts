import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { ApiError } from '../common/api-error';
import { BicycleRepository } from '../bicycles/bicycle.repository.interface';
import { StationRepository } from '../stations/station.repository.interface';
import { UserRepository } from '../users/user.repository.interface';
import { Trip } from './trip.entity';
import { TripRepository } from './trip.repository.interface';
import { UnlockCodeRepository } from './unlock-code.repository.interface';

const MAX_SCORE = 10;
const MIN_SCORE = 1;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const UNLOCK_CODE_TTL_MS = 5 * 60 * 1000;
const MAX_UNLOCK_CODE_ATTEMPTS = 5;

export type FinishedTrip = Trip & { puntuacion: number; suspendidoHasta: Date | null; bloqueado: boolean };

export class TripService {
    constructor(
        private readonly repository: TripRepository,
        private readonly bicycleRepository: BicycleRepository,
        private readonly stationRepository: StationRepository,
        private readonly userRepository: UserRepository,
        private readonly unlockCodeRepository: UnlockCodeRepository
    ) {}

    async getHistory(userId: string): Promise<Trip[]> {
        return this.repository.findHistoryByUser(userId);
    }

    async getAll(): Promise<Trip[]> {
        return this.repository.findAll();
    }

    async getActive(userId: string): Promise<Trip | null> {
        return this.repository.findActiveByUser(userId);
    }

    async generateUnlockCode(userId: string, bicycleId: string): Promise<{ codigo: string; expira_en: Date }> {
        if (typeof bicycleId !== 'string' || !bicycleId.trim()) {
            throw new ApiError('La bicicleta es obligatoria', 400);
        }
        await this.assertCanStart(userId);
        const bicycle = await this.bicycleRepository.findById(bicycleId);
        if (!bicycle) throw new ApiError('Bicicleta no encontrada', 404);
        if (bicycle.estado !== 'DISPONIBLE') throw new ApiError('La bicicleta ya no está disponible', 409);
        if (!bicycle.estacion_id?.trim()) throw new ApiError('La bicicleta no está en una estación', 400);
        const station = await this.stationRepository.findById(bicycle.estacion_id);
        if (!station) throw new ApiError('Estación no encontrada', 404);
        if (!station.activa) throw new ApiError('La estación no está habilitada', 400);

        const code = randomInt(10_000_000, 100_000_000).toString();
        const expiresAt = new Date(Date.now() + UNLOCK_CODE_TTL_MS);
        await this.unlockCodeRepository.issue({
            usuario_id: userId,
            bicicleta_id: bicycleId,
            codigo_hash: this.hashUnlockCode(code),
            expira_en: expiresAt
        });
        return { codigo: code, expira_en: expiresAt };
    }

    async start(
        userId: string,
        bicycleId: string,
        originStationId?: string,
        unlockCode?: string
    ): Promise<Trip> {
        if (typeof bicycleId !== 'string' || !bicycleId.trim()) {
            throw new ApiError('La bicicleta es obligatoria', 400);
        }
        if (typeof unlockCode !== 'string' || !unlockCode.trim()) {
            throw new ApiError('El código de desbloqueo es obligatorio', 400);
        }
        await this.assertCanStart(userId);

        const bicycle = await this.bicycleRepository.findById(bicycleId);
        if (!bicycle) throw new ApiError('Bicicleta no encontrada', 404);
        const originId = originStationId || bicycle.estacion_id;
        if (!originId?.trim()) throw new ApiError('La estación de origen es obligatoria', 400);
        const station = await this.stationRepository.findById(originId);
        if (!station) throw new ApiError('Estación no encontrada', 404);
        if (!station.activa) throw new ApiError('La estación no está habilitada', 400);
        if (bicycle.estacion_id !== originId) {
            throw new ApiError('La bicicleta no pertenece a la estación seleccionada', 400);
        }

        const activeCode = await this.unlockCodeRepository.findActive(userId, bicycleId, new Date());
        const submittedHash = this.hashUnlockCode(unlockCode.trim());
        if (!activeCode?.id || !this.hashesMatch(submittedHash, activeCode.codigo_hash)) {
            if (activeCode?.id) {
                await this.unlockCodeRepository.recordFailedAttempt(activeCode.id, MAX_UNLOCK_CODE_ATTEMPTS);
            }
            throw new ApiError('El código de desbloqueo no es correcto', 403);
        }
        if (!(await this.unlockCodeRepository.consume(
            activeCode.id,
            userId,
            bicycleId,
            submittedHash,
            new Date()
        ))) {
            throw new ApiError('El código de desbloqueo no es correcto o ya fue utilizado', 403);
        }

        const updated = await this.bicycleRepository.updateIfStatus(
            bicycleId,
            'DISPONIBLE',
            { estado: 'EN_USO', estacion_id: null }
        );
        if (!updated) throw new ApiError('La bicicleta ya no está disponible', 409);

        try {
            return await this.repository.create({
                usuario_id: userId,
                bicicleta_id: bicycleId,
                estacion_origen_id: originId,
                estacion_destino_id: null,
                fecha_inicio: new Date(),
                fecha_fin: null
            });
        } catch (error) {
            const restored = await this.bicycleRepository.updateIfStatus(
                bicycleId,
                'EN_USO',
                { estado: 'DISPONIBLE', estacion_id: originId }
            );
            if (!restored) throw new Error('No se pudo guardar el viaje ni restaurar la bicicleta');
            throw error;
        }
    }

    async finish(userId: string, destinationStationId: string): Promise<FinishedTrip> {
        if (typeof destinationStationId !== 'string' || !destinationStationId.trim()) {
            throw new ApiError('La estación de destino es obligatoria', 400);
        }
        const account = await this.userRepository.findById(userId);
        if (!account) throw new ApiError('Usuario no encontrado', 404);
        const trip = await this.repository.findActiveByUser(userId);
        if (!trip?.id) throw new ApiError('No tienes un viaje en curso', 404);

        const [station, bicycle] = await Promise.all([
            this.stationRepository.findById(destinationStationId),
            this.bicycleRepository.findById(trip.bicicleta_id)
        ]);
        if (!station) throw new ApiError('Estación no encontrada', 404);
        if (!station.activa) throw new ApiError('La estación no está habilitada', 400);
        if (!bicycle) throw new ApiError('Bicicleta no encontrada', 404);

        const updated = await this.bicycleRepository.updateIfStatus(
            trip.bicicleta_id,
            'EN_USO',
            { estado: 'DISPONIBLE', estacion_id: destinationStationId, ubicacion: station.nombre }
        );
        if (!updated) throw new ApiError('No se pudo devolver la bicicleta', 409);

        const finishedAt = new Date();
        let tripFinalized = false;
        try {
            const finished = await this.repository.finish(trip.id, userId, destinationStationId, finishedAt);
            if (!finished) throw new ApiError('El viaje ya fue finalizado', 409);
            tripFinalized = true;
            const startedAt = new Date(trip.fecha_inicio);
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
            const previousSuspension = account.suspendidoHasta ?? null;
            const suspendedUntil = suspensionDays[newScore]
                ? new Date(finishedAt.getTime() + suspensionDays[newScore] * DAY_MS)
                : previousSuspension && previousSuspension.getTime() > finishedAt.getTime()
                    ? previousSuspension
                    : null;
            const blocked = newScore === MIN_SCORE || (account.bloqueado ?? false);
            const saved = await this.userRepository.update(userId, {
                puntuacion: newScore,
                suspendidoHasta: suspendedUntil,
                bloqueado: blocked
            });
            if (!saved) {
                throw new Error('El viaje finalizó, pero no se pudo actualizar la puntuación del usuario');
            }
            return {
                ...finished,
                puntuacion: newScore,
                suspendidoHasta: suspendedUntil,
                bloqueado: blocked
            };
        } catch (error) {
            if (!tripFinalized) {
                const restored = await this.bicycleRepository.updateIfStatus(
                    trip.bicicleta_id,
                    'DISPONIBLE',
                    { estado: 'EN_USO', estacion_id: null, ubicacion: bicycle.ubicacion }
                );
                if (!restored) throw new Error('No se pudo finalizar el viaje ni restaurar la bicicleta');
            }
            throw error;
        }
    }

    private async assertCanStart(userId: string): Promise<void> {
        const account = await this.userRepository.findById(userId);
        if (!account) throw new ApiError('Usuario no encontrado', 404);
        if (account.bloqueado) throw new ApiError('La cuenta está bloqueada', 403);
        if (account.suspendidoHasta && account.suspendidoHasta.getTime() > Date.now()) {
            throw new ApiError('La cuenta está suspendida', 403);
        }
        if (await this.repository.findActiveByUser(userId)) {
            throw new ApiError('Ya tienes un viaje en curso', 409);
        }
    }

    private hashUnlockCode(code: string): string {
        return createHash('sha256').update(code).digest('hex');
    }

    private hashesMatch(submittedHash: string, storedHash: string): boolean {
        const submitted = Buffer.from(submittedHash, 'hex');
        const stored = Buffer.from(storedHash, 'hex');
        return submitted.length === stored.length && timingSafeEqual(submitted, stored);
    }
}
