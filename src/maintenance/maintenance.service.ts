import { ApiError } from '../common/api-error';
import { BicycleRepository } from '../bicycles/bicycle.repository.interface';
import { Maintenance, MaintenanceStatus, PerformedTask } from './maintenance.entity';
import { MaintenanceRepository } from './maintenance.repository.interface';

export class MaintenanceService {
    constructor(
        private readonly repository: MaintenanceRepository,
        private readonly bicycleRepository: BicycleRepository
    ) {}

    async getAll(): Promise<Maintenance[]> {
        return this.repository.findAll();
    }

    async updateStatus(
        bicycleId: string,
        status: MaintenanceStatus,
        technician: { id: string; nombre: string },
        detail: { estacion_id?: unknown; tareas?: unknown } = {}
    ): Promise<Maintenance> {
        const tasks = this.normalizeTasks(detail.tareas);
        const stationId = typeof detail.estacion_id === 'string' && detail.estacion_id.trim()
            ? detail.estacion_id.trim()
            : null;
        if (typeof bicycleId !== 'string' || !bicycleId.trim()) {
            throw new ApiError('El ID de la bicicleta es obligatorio', 400);
        }
        if (status !== 'DISPONIBLE' && status !== 'EN_MANTENIMIENTO') {
            throw new ApiError('El estado debe ser DISPONIBLE o EN_MANTENIMIENTO', 400);
        }

        const bicycle = await this.bicycleRepository.findById(bicycleId);
        if (!bicycle) throw new ApiError('Bicicleta no encontrada', 404);
        if (bicycle.estado !== 'DISPONIBLE' && bicycle.estado !== 'EN_MANTENIMIENTO') {
            throw new ApiError('No se puede cambiar el estado de una bicicleta reservada o en uso', 409);
        }

        const updated = await this.bicycleRepository.updateIfStatus(
            bicycleId,
            bicycle.estado,
            {
                estado: status,
                fecha_ultima_revision: new Date(),
                tecnico_responsable: technician.nombre
            }
        );
        if (!updated) throw new ApiError('El estado de la bicicleta cambió; vuelve a intentarlo', 409);

        const maintenance: Maintenance = {
            bicicleta_id: bicycleId,
            estado_anterior: bicycle.estado,
            estado_nuevo: status,
            tecnico_id: technician.id,
            tecnico_responsable: technician.nombre,
            fecha_actualizacion: updated.fecha_ultima_revision ?? new Date(),
            estacion_id: stationId ?? bicycle.estacion_id ?? null,
            tareas: tasks
        };
        try {
            return await this.repository.create(maintenance);
        } catch (error) {
            const restored = await this.bicycleRepository.updateIfStatus(
                bicycleId,
                status,
                {
                    estado: bicycle.estado,
                    fecha_ultima_revision: bicycle.fecha_ultima_revision,
                    tecnico_responsable: bicycle.tecnico_responsable
                }
            );
            if (!restored) throw new Error('No se pudo guardar el mantenimiento ni restaurar la bicicleta');
            throw error;
        }
    }

    private normalizeTasks(value: unknown): PerformedTask[] {
        if (value === undefined) return [];
        if (!Array.isArray(value) || value.length > 50) throw new ApiError('Las tareas no son válidas', 400);
        return value.map(item => {
            const zona = typeof item?.zona === 'string' ? item.zona.trim() : '';
            const tarea = typeof item?.tarea === 'string' ? item.tarea.trim() : '';
            if (!zona || !tarea) throw new ApiError('Cada tarea requiere zona y descripción', 400);
            return { zona, tarea };
        });
    }
}
