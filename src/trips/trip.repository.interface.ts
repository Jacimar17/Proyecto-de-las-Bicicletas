import { Trip } from './trip.entity';

export interface TripRepository {
    ensureIndexes(): Promise<void>;
    create(trip: Trip): Promise<Trip>;
    findActiveByUser(userId: string): Promise<Trip | null>;
    findById(id: string): Promise<Trip | null>;
    findAll(): Promise<Trip[]>;
    findHistoryByUser(userId: string): Promise<Trip[]>;
    finish(id: string, userId: string, destinationStationId: string, finishedAt: Date): Promise<Trip | null>;
}
