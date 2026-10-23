import { Estacion } from './estacion.entity';

export interface EstacionRepository {
    findAll(): Promise<Estacion[]>;
    findById(id: string): Promise<Estacion | null>;
    create(estacion: Estacion): Promise<Estacion>;
    update(id: string, estacion: Partial<Estacion>): Promise<Estacion | null>;
    delete(id: string): Promise<boolean>;
}
