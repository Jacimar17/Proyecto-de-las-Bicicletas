import { BicicletaRepository } from './bicicleta.repository.interface';

export class BicicletaService {
    constructor(readonly repository: BicicletaRepository) {}
}
