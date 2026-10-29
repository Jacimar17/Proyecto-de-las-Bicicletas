import { BicycleRepository } from '../bicycles/bicycle.repository.interface';
import { Station } from './station.entity';
import { StationRepository } from './station.repository.interface';

export interface StationSummary extends Station {
    total_bicicletas: number;
    disponibles: number;
}

export interface StationDetail extends Station {
    bicicletas: Awaited<ReturnType<BicycleRepository['findByStation']>>;
    disponibles: number;
}

export class StationNotFoundError extends Error {}

const OPERATIONAL_STATUSES = ['DISPONIBLE', 'APTA'];

function countAvailable(bicycles: Array<{ estado: string }>, capacity: number): number {
    const available = bicycles.filter(bicycle => OPERATIONAL_STATUSES.includes(bicycle.estado)).length;
    return Math.min(available, capacity);
}

export class StationService {
    constructor(
        private readonly stationRepository: StationRepository,
        private readonly bicycleRepository: BicycleRepository
    ) {}

    async getAll(): Promise<StationSummary[]> {
        const stations = await this.stationRepository.findAll();
        return Promise.all(stations.map(async station => {
            if (!station.id) throw new Error('La estación no tiene identificador');
            const bicycles = await this.bicycleRepository.findByStation(station.id);
            return {
                ...station,
                total_bicicletas: bicycles.length,
                disponibles: countAvailable(bicycles, station.capacidad)
            };
        }));
    }

    async getById(id: string): Promise<StationDetail> {
        const station = await this.stationRepository.findById(id);
        if (!station) throw new StationNotFoundError('Estación no encontrada');
        const bicycles = await this.bicycleRepository.findByStation(id);
        return { ...station, bicicletas: bicycles, disponibles: countAvailable(bicycles, station.capacidad) };
    }

    async create(data: Station): Promise<Station> {
        const station = { ...data, activa: data.activa ?? true };
        this.validate(station);
        return this.stationRepository.create({
            ...station,
            nombre: station.nombre.trim(),
            barrio: station.barrio.trim(),
            direccion: station.direccion.trim()
        });
    }

    async update(id: string, data: Partial<Station>): Promise<Station> {
        this.validateUpdate(data);
        const existing = await this.stationRepository.findById(id);
        if (!existing) throw new StationNotFoundError('Estación no encontrada');

        const merged = { ...existing, ...data };
        this.validate(merged);
        const bicycles = await this.bicycleRepository.findByStation(id);
        if (merged.capacidad < bicycles.length) {
            throw new Error('La capacidad no puede ser menor a las bicicletas asignadas');
        }

        const updates: Partial<Station> = {
            ...data,
            ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
            ...(data.barrio !== undefined ? { barrio: data.barrio.trim() } : {}),
            ...(data.direccion !== undefined ? { direccion: data.direccion.trim() } : {})
        };
        const updated = await this.stationRepository.update(id, updates);
        if (!updated) throw new StationNotFoundError('Estación no encontrada');
        return updated;
    }

    async delete(id: string): Promise<void> {
        const existing = await this.stationRepository.findById(id);
        if (!existing) throw new StationNotFoundError('Estación no encontrada');
        const bicycles = await this.bicycleRepository.findByStation(id);
        if (bicycles.length > 0) throw new Error('No se puede eliminar una estación con bicicletas asignadas');
        if (!await this.stationRepository.delete(id)) {
            throw new StationNotFoundError('Estación no encontrada');
        }
    }

    private validate(data: Station): void {
        if (!data.nombre?.trim()) throw new Error('El nombre es obligatorio');
        if (!data.barrio?.trim()) throw new Error('El barrio es obligatorio');
        if (!data.direccion?.trim()) throw new Error('La dirección es obligatoria');
        if (!Number.isInteger(data.capacidad) || data.capacidad < 1) {
            throw new Error('La capacidad debe ser un número entero mayor a 0');
        }
        if (!Number.isFinite(data.lat) || data.lat < -90 || data.lat > 90) {
            throw new Error('La latitud no es válida');
        }
        if (!Number.isFinite(data.lng) || data.lng < -180 || data.lng > 180) {
            throw new Error('La longitud no es válida');
        }
        if (typeof data.activa !== 'boolean') throw new Error('El estado de la estación no es válido');
    }

    private validateUpdate(data: Partial<Station>): void {
        if (Object.keys(data).length === 0) throw new Error('Debe enviar campos para actualizar');
        if (data.nombre !== undefined && !data.nombre.trim()) throw new Error('El nombre es obligatorio');
        if (data.barrio !== undefined && !data.barrio.trim()) throw new Error('El barrio es obligatorio');
        if (data.direccion !== undefined && !data.direccion.trim()) throw new Error('La dirección es obligatoria');
        if (data.capacidad !== undefined && (!Number.isInteger(data.capacidad) || data.capacidad < 1)) {
            throw new Error('La capacidad debe ser un número entero mayor a 0');
        }
        if (data.lat !== undefined && (!Number.isFinite(data.lat) || data.lat < -90 || data.lat > 90)) {
            throw new Error('La latitud no es válida');
        }
        if (data.lng !== undefined && (!Number.isFinite(data.lng) || data.lng < -180 || data.lng > 180)) {
            throw new Error('La longitud no es válida');
        }
        if (data.activa !== undefined && typeof data.activa !== 'boolean') {
            throw new Error('El estado de la estación no es válido');
        }
    }
}
