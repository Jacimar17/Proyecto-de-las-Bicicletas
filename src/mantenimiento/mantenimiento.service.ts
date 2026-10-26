import { ApiError } from '../common/api-error';
import { BicicletaRepository } from '../bicycles/bicicleta.repository.interface';
import { Mantenimiento, EstadoMantenimiento } from './mantenimiento.entity';
import { MantenimientoRepository } from './mantenimiento.repository.interface';

export class MantenimientoService {
    constructor(
        private readonly repository: MantenimientoRepository,
        private readonly bicicletaRepository: BicicletaRepository
    ) {}

    async getAll(): Promise<Mantenimiento[]> {
        return this.repository.findAll();
    }

    async updateEstado(
        bicicletaId: string,
        estado: EstadoMantenimiento,
        tecnico: { id: string; nombre: string }
    ): Promise<Mantenimiento> {
        if (typeof bicicletaId !== 'string' || !bicicletaId.trim()) {
            throw new ApiError('El ID de la bicicleta es obligatorio', 400);
        }
        if (estado !== 'DISPONIBLE' && estado !== 'EN_MANTENIMIENTO') {
            throw new ApiError('El estado debe ser DISPONIBLE o EN_MANTENIMIENTO', 400);
        }

        const bicicleta = await this.bicicletaRepository.findById(bicicletaId);
        if (!bicicleta) throw new ApiError('Bicicleta no encontrada', 404);
        if (bicicleta.estado !== 'DISPONIBLE' && bicicleta.estado !== 'EN_MANTENIMIENTO') {
            throw new ApiError('No se puede cambiar el estado de una bicicleta reservada o en uso', 409);
        }

        const actualizada = await this.bicicletaRepository.updateIfEstado(
            bicicletaId,
            bicicleta.estado,
            {
                estado,
                fecha_ultima_revision: new Date(),
                tecnico_responsable: tecnico.nombre
            }
        );
        if (!actualizada) throw new ApiError('El estado de la bicicleta cambió; vuelve a intentarlo', 409);

        const mantenimiento: Mantenimiento = {
            bicicleta_id: bicicletaId,
            estado_anterior: bicicleta.estado,
            estado_nuevo: estado,
            tecnico_id: tecnico.id,
            tecnico_responsable: tecnico.nombre,
            fecha_actualizacion: actualizada.fecha_ultima_revision ?? new Date()
        };
        try {
            return await this.repository.create(mantenimiento);
        } catch (error) {
            const restored = await this.bicicletaRepository.updateIfEstado(
                bicicletaId,
                estado,
                {
                    estado: bicicleta.estado,
                    fecha_ultima_revision: bicicleta.fecha_ultima_revision,
                    tecnico_responsable: bicicleta.tecnico_responsable
                }
            );
            if (!restored) throw new Error('No se pudo guardar el mantenimiento ni restaurar la bicicleta');
            throw error;
        }
    }
}
