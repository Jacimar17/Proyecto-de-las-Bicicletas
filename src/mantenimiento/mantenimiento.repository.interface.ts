import { Mantenimiento } from './mantenimiento.entity';

export interface MantenimientoRepository {
    create(mantenimiento: Mantenimiento): Promise<Mantenimiento>;
    findAll(): Promise<Mantenimiento[]>;
}
