import 'dotenv/config';
import { randomBytes, randomInt } from 'node:crypto';
import { Document, MongoClient } from 'mongodb';
import { getAtlasUri, getMongoDbName } from '../config/db';

interface StationDocument extends Document {
    nombre: string;
    capacidad: number;
    activa: boolean;
}

interface BicycleDocument extends Document {
    estado: string;
    estacion_id: string | null;
    ubicacion: string;
}

interface TripDocument extends Document {
    bicicleta_id: string;
}

interface Assignment {
    stationId: string;
    stationName: string;
}

function shuffle<T>(values: T[]): T[] {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

async function redistribute(): Promise<void> {
    const uri = getAtlasUri();
    if (!uri) throw new Error('ATLAS_URI es obligatorio para ejecutar esta redistribución.');

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    try {
        const db = client.db(getMongoDbName());
        const stationsCollection = db.collection<StationDocument>('stations');
        const bicyclesCollection = db.collection<BicycleDocument>('bicycles');
        const tripsCollection = db.collection<TripDocument>('trips');
        const session = client.startSession();
        let result = { unassigned: 0, protected: 0 };

        try {
            await session.withTransaction(async () => {
                const stations = await stationsCollection.find({ activa: true }, { session }).toArray();
                const bicycles = await bicyclesCollection.find({}, { session }).toArray();
                const activeTrips = await tripsCollection.find({ fecha_fin: null }, { session }).toArray();
                if (stations.length === 0) throw new Error('No hay estaciones activas.');
                if (bicycles.length === 0) throw new Error('No hay bicicletas para redistribuir.');

                for (const station of stations) {
                    if (!Number.isInteger(station.capacidad) || station.capacidad < 9) {
                        throw new Error(`La estación "${station.nombre}" no permite asignar al menos 9 bicicletas.`);
                    }
                }

                const activeTripBicycleIds = new Set(activeTrips.map(trip => trip.bicicleta_id));
                const protectedBicycles = bicycles.filter(bicycle =>
                    bicycle.estado === 'EN_USO'
                    || bicycle.estado === 'RESERVADA'
                    || activeTripBicycleIds.has(String(bicycle._id))
                );
                const protectedIds = new Set(protectedBicycles.map(bicycle => String(bicycle._id)));
                const movable = shuffle(bicycles.filter(bicycle => !protectedIds.has(String(bicycle._id))));
                const targets = stations.map(station => {
                    const stationId = String(station._id);
                    const fixedCount = protectedBicycles.filter(bicycle => bicycle.estacion_id === stationId).length;
                    const maximum = Math.min(14, station.capacidad);
                    const minimum = Math.max(9, fixedCount);
                    if (minimum > maximum) {
                        throw new Error(`La estación "${station.nombre}" tiene bicicletas protegidas que exceden el límite de 14.`);
                    }
                    return {
                        stationId,
                        stationName: station.nombre,
                        fixedCount,
                        targetCount: randomInt(minimum, maximum + 1)
                    };
                });

                const minimumMovable = targets.reduce((total, target) => total + Math.max(0, 9 - target.fixedCount), 0);
                if (minimumMovable > movable.length) {
                    throw new Error('No hay suficientes bicicletas reasignables para dejar al menos 9 en cada estación activa.');
                }

                const movableTargetCount = (): number => targets.reduce(
                    (total, target) => total + target.targetCount - target.fixedCount,
                    0
                );
                while (movableTargetCount() > movable.length) {
                    const candidates = targets.filter(target => target.targetCount > Math.max(9, target.fixedCount));
                    if (candidates.length === 0) throw new Error('No se pudo ajustar la distribución al stock disponible.');
                    candidates[randomInt(candidates.length)].targetCount--;
                }

                const assignments = new Map<string, Assignment>();
                let offset = 0;
                for (const target of shuffle(targets)) {
                    const needed = target.targetCount - target.fixedCount;
                    for (const bicycle of movable.slice(offset, offset + needed)) {
                        assignments.set(String(bicycle._id), {
                            stationId: target.stationId,
                            stationName: target.stationName
                        });
                    }
                    offset += needed;
                }

                const codeOrder = shuffle(bicycles);
                const width = Math.max(2, String(codeOrder.length).length);
                const now = new Date();
                const runId = randomBytes(8).toString('hex');
                const temporaryCodes = codeOrder.map((bicycle, index) => ({
                    updateOne: {
                        filter: { _id: bicycle._id },
                        update: { $set: { codigo: `__REDISTRIBUTE_${runId}_${index}` } }
                    }
                }));
                await bicyclesCollection.bulkWrite(temporaryCodes, { session, ordered: true });

                const finalUpdates = codeOrder.map((bicycle, index) => {
                    const assignment = assignments.get(String(bicycle._id));
                    const isProtected = protectedIds.has(String(bicycle._id));
                    return {
                        updateOne: {
                            filter: { _id: bicycle._id },
                            update: {
                                $set: {
                                    codigo: `BICI-${String(index + 1).padStart(width, '0')}`,
                                    updatedAt: now,
                                    ...(!isProtected ? {
                                        estacion_id: assignment?.stationId ?? null,
                                        ubicacion: assignment?.stationName ?? 'Sin asignar'
                                    } : {})
                                }
                            }
                        }
                    };
                });
                await bicyclesCollection.bulkWrite(finalUpdates, { session, ordered: true });
                result = {
                    unassigned: movable.length - assignments.size,
                    protected: protectedBicycles.length
                };
            });
        } finally {
            await session.endSession();
        }

        const stations = await stationsCollection.find({ activa: true }).toArray();
        const bicycles = await bicyclesCollection.find({}, { projection: { codigo: 1, estacion_id: 1 } }).toArray();
        const codes = new Set(bicycles.map(bicycle => bicycle.codigo));
        if (codes.size !== bicycles.length || bicycles.some(bicycle => !/^BICI-\d{2,}$/.test(bicycle.codigo))) {
            throw new Error('La verificación encontró códigos duplicados o con formato inválido.');
        }
        const activeStationIds = new Set(stations.map(station => String(station._id)));
        const actualCounts = new Map<string, number>();
        for (const bicycle of bicycles) {
            if (bicycle.estacion_id && activeStationIds.has(bicycle.estacion_id)) {
                actualCounts.set(bicycle.estacion_id, (actualCounts.get(bicycle.estacion_id) ?? 0) + 1);
            }
        }
        for (const station of stations) {
            const count = actualCounts.get(String(station._id)) ?? 0;
            if (count < 9 || count > 14 || count > station.capacidad) {
                throw new Error(`La verificación encontró una cantidad inválida en "${station.nombre}".`);
            }
        }

        console.log(JSON.stringify({
            database: getMongoDbName(),
            bicyclesRenamed: bicycles.length,
            activeStations: Object.fromEntries(stations.map(station => [
                station.nombre,
                actualCounts.get(String(station._id)) ?? 0
            ])),
            availableBicyclesLeftUnassigned: result.unassigned,
            protectedBicyclesNotMoved: result.protected
        }, null, 2));
    } finally {
        await client.close();
    }
}

redistribute().catch((error: unknown) => {
    console.error('Error al redistribuir bicicletas de Atlas:', error);
    process.exitCode = 1;
});
