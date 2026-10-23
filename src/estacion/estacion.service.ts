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
        return Promise.all(estaciones.map(async (estacion) => {
            if (!estacion.id) throw new Error('La estación no tiene identificador');
            const bicicletas = await this.bicicletaRepository.findByEstacion(estacion.id);
            const disponibles = bicicletas.filter(b => b.estado === 'DISPONIBLE').length;
            return { ...estacion, total_bicicletas: bicicletas.length, disponibles };
        }));
    }

    async getById(id: string): Promise<EstacionDetalle> {
        const estacion = await this.estacionRepository.findById(id);
        if (!estacion) throw new EstacionNoEncontradaError('Estación no encontrada');
        const bicicletas = await this.bicicletaRepository.findByEstacion(id);
        const disponibles = bicicletas.filter(b => b.estado === 'DISPONIBLE').length;
        return { ...estacion, bicicletas, disponibles };
    }

    async create(data: Estacion): Promise<Estacion> {
        this.validar(data);
        return this.estacionRepository.create({
            nombre: data.nombre.trim(),
            barrio: data.barrio.trim(),
            direccion: data.direccion.trim(),
            capacidad: data.capacidad,
            activa: true,
        });
    }

    async update(id: string, data: Partial<Estacion>): Promise<Estacion> {
        this.validarActualizacion(data);
        const actualizada = await this.estacionRepository.update(id, data);
        if (!actualizada) throw new EstacionNoEncontradaError('Estación no encontrada');
        return actualizada;
    }

    async delete(id: string): Promise<void> {
        const eliminada = await this.estacionRepository.delete(id);
        if (!eliminada) throw new EstacionNoEncontradaError('Estación no encontrada');
    }

    private validar(data: Estacion): void {
        if (!data.nombre?.trim()) throw new Error('El nombre es obligatorio');
        if (!data.barrio?.trim()) throw new Error('El barrio es obligatorio');
        if (!data.direccion?.trim()) throw new Error('La dirección es obligatoria');
        if (!Number.isInteger(data.capacidad) || data.capacidad < 1) {
            throw new Error('La capacidad debe ser un número entero mayor a 0');
        }
    }

    private validarActualizacion(data: Partial<Estacion>): void {
        if (Object.keys(data).length === 0) throw new Error('Debe enviar campos para actualizar');
        if (data.nombre !== undefined && !data.nombre.trim()) throw new Error('El nombre es obligatorio');
        if (data.barrio !== undefined && !data.barrio.trim()) throw new Error('El barrio es obligatorio');
        if (data.direccion !== undefined && !data.direccion.trim()) throw new Error('La dirección es obligatoria');
        if (data.capacidad !== undefined && (!Number.isInteger(data.capacidad) || data.capacidad < 1)) {
            throw new Error('La capacidad debe ser mayor a 0');
        }
    }
}
