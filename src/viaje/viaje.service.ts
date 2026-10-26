import { ApiError } from '../common/api-error';
import { BicicletaRepository } from '../bicicleta/bicicleta.repository.interface';
import { EstacionRepository } from '../estacion/estacion.repository.interface';
import { Viaje } from './viaje.entity';
import { ViajeRepository } from './viaje.repository.interface';

export class ViajeService {
    constructor(
        private readonly repository: ViajeRepository,
        private readonly bicicletaRepository: BicicletaRepository,
        private readonly estacionRepository: EstacionRepository
    ) {}

    async getHistory(usuarioId: string): Promise<Viaje[]> {
        return this.repository.findHistoryByUser(usuarioId);
    }

    async getActive(usuarioId: string): Promise<Viaje | null> {
        return this.repository.findActiveByUser(usuarioId);
    }

    async start(usuarioId: string, bicicletaId: string, estacionOrigenId: string): Promise<Viaje> {
        if (typeof bicicletaId !== 'string' || !bicicletaId.trim() ||
            typeof estacionOrigenId !== 'string' || !estacionOrigenId.trim()) {
            throw new ApiError('La bicicleta y la estación de origen son obligatorias', 400);
        }
        if (await this.repository.findActiveByUser(usuarioId)) {
            throw new ApiError('Ya tienes un viaje en curso', 409);
        }

        const [bicicleta, estacion] = await Promise.all([
            this.bicicletaRepository.findById(bicicletaId),
            this.estacionRepository.findById(estacionOrigenId)
        ]);
        if (!bicicleta) throw new ApiError('Bicicleta no encontrada', 404);
        if (!estacion) throw new ApiError('Estación no encontrada', 404);
        if (!estacion.activa) throw new ApiError('La estación no está habilitada', 400);
        if (bicicleta.estacion_id !== estacionOrigenId) {
            throw new ApiError('La bicicleta no pertenece a la estación seleccionada', 400);
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
                estacion_origen_id: estacionOrigenId,
                estacion_destino_id: null,
                fecha_inicio: new Date(),
                fecha_fin: null
            });
        } catch (error) {
            const restored = await this.bicicletaRepository.updateIfEstado(
                bicicletaId,
                'EN_USO',
                { estado: 'DISPONIBLE', estacion_id: estacionOrigenId }
            );
            if (!restored) throw new Error('No se pudo guardar el viaje ni restaurar la bicicleta');
            throw error;
        }
    }

    async finish(usuarioId: string, estacionDestinoId: string): Promise<Viaje> {
        if (typeof estacionDestinoId !== 'string' || !estacionDestinoId.trim()) {
            throw new ApiError('La estación de destino es obligatoria', 400);
        }
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

        try {
            const finalizado = await this.repository.finish(
                viaje.id,
                usuarioId,
                estacionDestinoId,
                new Date()
            );
            if (!finalizado) throw new ApiError('El viaje ya fue finalizado', 409);
            return finalizado;
        } catch (error) {
            const restored = await this.bicicletaRepository.updateIfEstado(
                viaje.bicicleta_id,
                'DISPONIBLE',
                { estado: 'EN_USO', estacion_id: null, ubicacion: bicicleta.ubicacion }
            );
            if (!restored) throw new Error('No se pudo finalizar el viaje ni restaurar la bicicleta');
            throw error;
        }
    }
}
