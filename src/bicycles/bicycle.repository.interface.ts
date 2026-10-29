import { Bicycle, BicycleStatus } from './bicycle.entity';

export interface BicycleRepository {
    findAll(): Promise<Bicycle[]>;
    findById(id: string): Promise<Bicycle | null>;
    findByCode(codigo: string): Promise<Bicycle | null>;
    findByStation(stationId: string): Promise<Bicycle[]>;
    create(bicycle: Bicycle): Promise<Bicycle>;
    update(id: string, bicycle: Partial<Bicycle>): Promise<Bicycle | null>;
    updateIfStatus(id: string, estado: BicycleStatus, bicycle: Partial<Bicycle>): Promise<Bicycle | null>;
    delete(id: string): Promise<boolean>;
}
