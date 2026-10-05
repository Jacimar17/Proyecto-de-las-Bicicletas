import { Estacion } from './estacion.entity';
import { EstacionRepository } from './estacion.repository.interface';
import { BicicletaRepository } from '../bicicleta/bicicleta.repository.interface';

export class EstacionService {

    constructor(
        private readonly estacionRepository: EstacionRepository,
        private readonly bicicletaRepository: BicicletaRepository
    ) {}

    async getAll(): Promise<any[]> {
        const estaciones = await this.estacionRepository.findAll();
        const result = await Promise.all(estaciones.map(async (estacion) => {
            const bicicletas = await this.bicicletaRepository.findByEstacion(estacion.id!);
            const disponibles = bicicletas.filter(b => b.estado === 'DISPONIBLE').length;
            return { ...estacion, total_bicicletas: bicicletas.length, disponibles };
        }));
        return result;
    }

    async getById(id: string): Promise<any> {
        const estacion = await this.estacionRepository.findById(id);
        if (!estacion) throw new Error('Estación no encontrada');
        const bicicletas = await this.bicicletaRepository.findByEstacion(id);
        const disponibles = bicicletas.filter(b => b.estado === 'DISPONIBLE').length;
        return { ...estacion, bicicletas, disponibles };
    }

    async create(data: Estacion): Promise<Estacion> {
        this.validar(data);
        return this.estacionRepository.create({ ...data, activa: true });
    }

    async update(id: string, data: Partial<Estacion>): Promise<Estacion> {
        const actualizada = await this.estacionRepository.update(id, data);
        if (!actualizada) throw new Error('Estación no encontrada');
        return actualizada;
    }

    async delete(id: string): Promise<void> {
        const eliminada = await this.estacionRepository.delete(id);
        if (!eliminada) throw new Error('Estación no encontrada');
    }

    private validar(data: Estacion): void {
        if (!data.nombre?.trim()) throw new Error('El nombre es obligatorio');
        if (!data.barrio?.trim()) throw new Error('El barrio es obligatorio');
        if (!data.direccion?.trim()) throw new Error('La dirección es obligatoria');
        if (!data.capacidad || data.capacidad < 1) throw new Error('La capacidad debe ser mayor a 0');
    }
}
