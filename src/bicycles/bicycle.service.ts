import { StationRepository } from '../stations/station.repository.interface';
import { Bicycle, BicycleStatus } from './bicycle.entity';
import { BicycleRepository } from './bicycle.repository.interface';

const STATUSES: BicycleStatus[] = [
    'DISPONIBLE', 'RESERVADA', 'EN_USO', 'EN_MANTENIMIENTO', 'APTA', 'NO_APTA'
];

export class BicycleService {
    constructor(
        private readonly repository: BicycleRepository,
        private readonly stationRepository: StationRepository
    ) {}

    async getAll(): Promise<Bicycle[]> {
        return this.repository.findAll();
    }

    async create(data: Bicycle): Promise<Bicycle> {
        this.validate(data);
        if (await this.repository.findByCode(data.codigo.trim())) {
            throw new Error('Ya existe una bicicleta con ese código');
        }
        await this.validateStation(data.estacion_id);
        return this.repository.create({ ...data, codigo: data.codigo.trim() });
    }

    async update(id: string, data: Partial<Bicycle>): Promise<Bicycle> {
        const existing = await this.repository.findById(id);
        if (!existing) throw new Error('Bicicleta no encontrada');

        const updated = { ...existing, ...data };
        this.validate(updated);
        const duplicate = await this.repository.findByCode(updated.codigo.trim());
        if (duplicate && duplicate.id !== id) throw new Error('Ya existe una bicicleta con ese código');
        await this.validateStation(updated.estacion_id);

        const result = await this.repository.update(id, { ...data, codigo: updated.codigo.trim() });
        if (!result) throw new Error('Bicicleta no encontrada');
        return result;
    }

    async delete(id: string): Promise<void> {
        const bicycle = await this.repository.findById(id);
        if (!bicycle) throw new Error('Bicicleta no encontrada');
        if (bicycle.estado === 'EN_USO' || bicycle.estado === 'RESERVADA') {
            throw new Error('No se puede eliminar una bicicleta en uso o reservada');
        }
        if (!await this.repository.delete(id)) throw new Error('Bicicleta no encontrada');
    }

    private validate(data: Bicycle): void {
        if (!data.codigo?.trim()) throw new Error('El código es obligatorio');
        if (!data.modelo?.trim()) throw new Error('El modelo es obligatorio');
        if (!data.ubicacion?.trim()) throw new Error('La ubicación es obligatoria');
        if (!STATUSES.includes(data.estado)) throw new Error('El estado de la bicicleta no es válido');
        if (data.estacion_id !== null && (typeof data.estacion_id !== 'string' || !data.estacion_id.trim())) {
            throw new Error('La estación no es válida');
        }
    }

    private async validateStation(id: string | null): Promise<void> {
        if (id && !await this.stationRepository.findById(id)) {
            throw new Error('La estación indicada no existe');
        }
    }
}
