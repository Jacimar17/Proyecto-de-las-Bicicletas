import { Estacion } from './estacion.entity';
import { EstacionRepository } from './estacion.repository.interface';
import { BicicletaRepository } from '../bicycles/bicicleta.repository.interface';

export interface EstacionResumen extends Estacion {
    total_bicicletas: number;
    disponibles: number;
}

export interface EstacionDetalle extends Estacion {
    bicicletas: Awaited<ReturnType<BicicletaRepository['findByEstacion']>>;
    disponibles: number;
}

export class EstacionNoEncontradaError extends Error {}

export class EstacionService {
    constructor(
        private readonly estacionRepository: EstacionRepository,
        private readonly bicicletaRepository: BicicletaRepository
    ) {}

    async getAll(): Promise<EstacionResumen[]> {
        const estaciones = await this.estacionRepository.findAll();
        return Promise.all(estaciones.map(async estacion => {
            if (!estacion.id) throw new Error('La estación no tiene identificador');
            const bicicletas = await this.bicicletaRepository.findByEstacion(estacion.id);
            return {
                ...estacion,
                total_bicicletas: bicicletas.length,
                disponibles: bicicletas.filter(bicicleta => bicicleta.estado === 'DISPONIBLE').length
            };
        }));
    }

    async getById(id: string): Promise<EstacionDetalle> {
        const estacion = await this.estacionRepository.findById(id);
        if (!estacion) throw new EstacionNoEncontradaError('Estación no encontrada');
        const bicicletas = await this.bicicletaRepository.findByEstacion(id);
        const disponibles = bicicletas.filter(bicicleta => bicicleta.estado === 'DISPONIBLE').length;
        return { ...estacion, bicicletas, disponibles };
    }

    async create(data: Estacion): Promise<Estacion> {
        const estacion = { ...data, activa: data.activa ?? true };
        this.validar(estacion);
        return this.estacionRepository.create({
            ...estacion,
            nombre: estacion.nombre.trim(),
            barrio: estacion.barrio.trim(),
            direccion: estacion.direccion.trim()
        });
    }

    async update(id: string, data: Partial<Estacion>): Promise<Estacion> {
        this.validarActualizacion(data);
        const existente = await this.estacionRepository.findById(id);
        if (!existente) throw new EstacionNoEncontradaError('Estación no encontrada');

        const actualizadaData = { ...existente, ...data };
        this.validar(actualizadaData);
        const bicicletas = await this.bicicletaRepository.findByEstacion(id);
        if (actualizadaData.capacidad < bicicletas.length) {
            throw new Error('La capacidad no puede ser menor a las bicicletas asignadas');
        }

        const updates: Partial<Estacion> = {
            ...data,
            ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
            ...(data.barrio !== undefined ? { barrio: data.barrio.trim() } : {}),
            ...(data.direccion !== undefined ? { direccion: data.direccion.trim() } : {})
        };
        const actualizada = await this.estacionRepository.update(id, updates);
        if (!actualizada) throw new EstacionNoEncontradaError('Estación no encontrada');
        return actualizada;
    }

    async delete(id: string): Promise<void> {
        const existente = await this.estacionRepository.findById(id);
        if (!existente) throw new EstacionNoEncontradaError('Estación no encontrada');
        const bicicletas = await this.bicicletaRepository.findByEstacion(id);
        if (bicicletas.length > 0) throw new Error('No se puede eliminar una estación con bicicletas asignadas');
        if (!await this.estacionRepository.delete(id)) {
            throw new EstacionNoEncontradaError('Estación no encontrada');
        }
    }

    private validar(data: Estacion): void {
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

    private validarActualizacion(data: Partial<Estacion>): void {
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
