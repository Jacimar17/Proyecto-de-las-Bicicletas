import { Maintenance } from './maintenance.entity';

export interface MaintenanceRepository {
    create(maintenance: Maintenance): Promise<Maintenance>;
    findAll(): Promise<Maintenance[]>;
}
