import { Bicicleta, EstadoBicicleta } from './bicicleta.entity';
import { BicicletaRepository } from './bicicleta.repository.interface';
import { EstacionRepository } from '../estacion/estacion.repository.interface';

const ESTADOS: EstadoBicicleta[] = [
    'DISPONIBLE', 'RESERVADA', 'EN_USO', 'EN_MANTENIMIENTO', 'APTA', 'NO_APTA'
];

export class BicicletaService {
    constructor(
        private readonly repository: BicicletaRepository,
        private readonly estacionRepository: EstacionRepository
    ) {}

    async getAll(): Promise<Bicicleta[]> {
        const bicicletas = await this.repository.findAll();
        return bicicletas.map(({ unlockCode: _unlockCode, ...publica }) => publica);
    }

    async create(data: Bicicleta): Promise<Bicicleta> {
        this.validate(data);
        if (await this.repository.findByCodigo(data.codigo.trim())) {
            throw new Error('Ya existe una bicicleta con ese código');
        }
        await this.validateStation(data.estacion_id);
        return this.repository.create({ ...data, codigo: data.codigo.trim() });
    }

    async update(id: string, data: Partial<Bicicleta>): Promise<Bicicleta> {
        const existing = await this.repository.findById(id);
        if (!existing) throw new Error('Bicicleta no encontrada');

        const updated = { ...existing, ...data };
        this.validate(updated);
        const duplicate = await this.repository.findByCodigo(updated.codigo.trim());
        if (duplicate && duplicate.id !== id) throw new Error('Ya existe una bicicleta con ese código');
        await this.validateStation(updated.estacion_id);

        const result = await this.repository.update(id, { ...data, codigo: updated.codigo.trim() });
        if (!result) throw new Error('Bicicleta no encontrada');
        return result;
    }

    async delete(id: string): Promise<void> {
        const bicicleta = await this.repository.findById(id);
        if (!bicicleta) throw new Error('Bicicleta no encontrada');
        if (bicicleta.estado === 'EN_USO' || bicicleta.estado === 'RESERVADA') {
            throw new Error('No se puede eliminar una bicicleta en uso o reservada');
        }
        if (!await this.repository.delete(id)) throw new Error('Bicicleta no encontrada');
    }

    private validate(data: Bicicleta): void {
        if (!data.codigo?.trim()) throw new Error('El código es obligatorio');
        if (!data.modelo?.trim()) throw new Error('El modelo es obligatorio');
        if (!data.ubicacion?.trim()) throw new Error('La ubicación es obligatoria');
        if (!ESTADOS.includes(data.estado)) throw new Error('El estado de la bicicleta no es válido');
        if (data.estacion_id !== null && (typeof data.estacion_id !== 'string' || !data.estacion_id.trim())) {
            throw new Error('La estación no es válida');
        }
    }

    private async validateStation(id: string | null): Promise<void> {
        if (id && !await this.estacionRepository.findById(id)) {
            throw new Error('La estación indicada no existe');
        }
    }
}
