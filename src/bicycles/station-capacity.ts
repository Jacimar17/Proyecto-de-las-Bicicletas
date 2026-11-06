import { ApiError } from '../common/api-error';
import { BicycleRepository } from './bicycle.repository.interface';

export const MAX_BICYCLES_PER_STATION = 15;

export class StationCapacityError extends ApiError {
    constructor() {
        super(`La estación alcanzó el límite máximo de ${MAX_BICYCLES_PER_STATION} bicicletas`, 409);
        this.name = 'StationCapacityError';
    }
}

export async function assertStationHasCapacity(
    repository: BicycleRepository,
    stationId: string
): Promise<void> {
    const bicycles = await repository.findByStation(stationId);
    if (bicycles.length >= MAX_BICYCLES_PER_STATION) {
        throw new StationCapacityError();
    }
}
