import { Bicicleta } from './bicicleta.entity';

export interface BicicletaRepository {
    findAll(): Promise<Bicicleta[]>;
    findById(id: string): Promise<Bicicleta | null>;
    findByCodigo(codigo: string): Promise<Bicicleta | null>;
    findByEstacion(estacion_id: string): Promise<Bicicleta[]>;
    create(bicicleta: Bicicleta): Promise<Bicicleta>;
    update(id: string, bicicleta: Partial<Bicicleta>): Promise<Bicicleta | null>;
    delete(id: string): Promise<boolean>;
}
