import { Estacion } from './estacion.entity';
import { EstacionRepository } from './estacion.repository.interface';
import { BicicletaRepository } from '../bicicleta/bicicleta.repository.interface';

export class EstacionService {

    constructor(
        private readonly estacionRepository: EstacionRepository,
        private readonly bicicletaRepository: BicicletaRepository
    ) {}

    async getAll(): Promise<Array<Estacion & { total_bicicletas: number; disponibles: number }>> {
        const estaciones = await this.estacionRepository.findAll();
        const result = await Promise.all(estaciones.map(async (estacion) => {
            const bicicletas = await this.bicicletaRepository.findByEstacion(estacion.id!);
            const disponibles = bicicletas.filter(b => b.estado === 'DISPONIBLE').length;
            return { ...estacion, total_bicicletas: bicicletas.length, disponibles };
        }));
        return result;
    }

    async getById(id: string): Promise<Estacion & { bicicletas: Awaited<ReturnType<BicicletaRepository['findByEstacion']>>; disponibles: number }> {
        const estacion = await this.estacionRepository.findById(id);
        if (!estacion) throw new Error('Estación no encontrada');
        const bicicletas = await this.bicicletaRepository.findByEstacion(id);
        const disponibles = bicicletas.filter(b => b.estado === 'DISPONIBLE').length;
        return { ...estacion, bicicletas, disponibles };
    }

    async create(data: Estacion): Promise<Estacion> {
        this.validar(data);
        return this.estacionRepository.create({
            ...data,
            nombre: data.nombre.trim(),
            barrio: data.barrio.trim(),
            direccion: data.direccion.trim()
        });
    }

    async update(id: string, data: Partial<Estacion>): Promise<Estacion> {
        const existente = await this.estacionRepository.findById(id);
        if (!existente) throw new Error('Estación no encontrada');
        const actualizadaData = { ...existente, ...data };
        this.validar(actualizadaData);
        const bicicletas = await this.bicicletaRepository.findByEstacion(id);
        if (actualizadaData.capacidad < bicicletas.length) {
            throw new Error('La capacidad no puede ser menor a las bicicletas asignadas');
        }
        const actualizada = await this.estacionRepository.update(id, {
            nombre: actualizadaData.nombre.trim(),
            barrio: actualizadaData.barrio.trim(),
            direccion: actualizadaData.direccion.trim(),
            lat: actualizadaData.lat,
            lng: actualizadaData.lng,
            capacidad: actualizadaData.capacidad,
            activa: actualizadaData.activa
        });
        if (!actualizada) throw new Error('Estación no encontrada');
        return actualizada;
    }

    async delete(id: string): Promise<void> {
        const bicicletas = await this.bicicletaRepository.findByEstacion(id);
        if (bicicletas.length > 0) throw new Error('No se puede eliminar una estación con bicicletas asignadas');
        const eliminada = await this.estacionRepository.delete(id);
        if (!eliminada) throw new Error('Estación no encontrada');
    }

    private validar(data: Estacion): void {
        if (!data.nombre?.trim()) throw new Error('El nombre es obligatorio');
        if (!data.barrio?.trim()) throw new Error('El barrio es obligatorio');
        if (!data.direccion?.trim()) throw new Error('La dirección es obligatoria');
        if (!Number.isInteger(data.capacidad) || data.capacidad < 1) throw new Error('La capacidad debe ser un entero mayor a 0');
        if (!Number.isFinite(data.lat) || data.lat < -90 || data.lat > 90) throw new Error('La latitud no es válida');
        if (!Number.isFinite(data.lng) || data.lng < -180 || data.lng > 180) throw new Error('La longitud no es válida');
        if (typeof data.activa !== 'boolean') throw new Error('El estado de la estación no es válido');
    }
}
