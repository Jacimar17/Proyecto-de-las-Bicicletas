import { Station } from './station.entity';

export interface StationRepository {
    findAll(): Promise<Station[]>;
    findById(id: string): Promise<Station | null>;
    create(station: Station): Promise<Station>;
    update(id: string, station: Partial<Station>): Promise<Station | null>;
    delete(id: string): Promise<boolean>;
}
