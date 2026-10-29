import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Collection, Document, MongoClient, ObjectId } from 'mongodb';
import { getMongoConnectionUri, getMongoDbName, getMongoMode } from './config/db';
import { COLLECTIONS } from './config/collections';

interface StationSeedDocument extends Document {
    nombre: string;
    barrio: string;
    direccion: string;
    lat: number;
    lng: number;
    capacidad: number;
    activa: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const stations = [
    { nombre: 'Centro', barrio: 'Centro', direccion: 'San Martín y Belgrano', lat: -33.7456, lng: -61.9688, capacidad: 10, activa: true },
    { nombre: 'San Martín', barrio: 'San Martín', direccion: 'Av. San Martín 1200', lat: -33.7420, lng: -61.9720, capacidad: 10, activa: true },
    { nombre: 'Belgrano', barrio: 'Belgrano', direccion: 'Belgrano y Mitre', lat: -33.7500, lng: -61.9640, capacidad: 10, activa: true },
    { nombre: 'Tiro Federal', barrio: 'Tiro Federal', direccion: 'Av. Circunvalación 500', lat: -33.7380, lng: -61.9560, capacidad: 10, activa: true },
    { nombre: 'Juan XXIII', barrio: 'Juan XXIII', direccion: 'Juan XXIII y Libertad', lat: -33.7550, lng: -61.9800, capacidad: 10, activa: true },
];

// Barrios de Venado Tuerto: coordenadas aproximadas, inicializados como estaciones no habilitadas.
const inactiveNeighborhoods = [
    { nombre: 'Barrio Norte', lat: -33.7300, lng: -61.9690 },
    { nombre: 'Barrio Sur', lat: -33.7610, lng: -61.9690 },
    { nombre: 'Barrio Hipódromo', lat: -33.7480, lng: -61.9480 },
    { nombre: 'Barrio Ferroviario', lat: -33.7520, lng: -61.9760 },
    { nombre: 'Barrio Güemes', lat: -33.7400, lng: -61.9830 },
    { nombre: 'Barrio Jardín', lat: -33.7350, lng: -61.9600 },
    { nombre: 'Barrio San Cayetano', lat: -33.7580, lng: -61.9580 },
    { nombre: 'Barrio Quirno Costa', lat: -33.7440, lng: -61.9900 },
    { nombre: 'Barrio Villa Casey', lat: -33.7650, lng: -61.9750 },
    { nombre: 'Barrio Parque', lat: -33.7250, lng: -61.9750 },
].map(barrio => ({
    ...barrio,
    barrio: barrio.nombre,
    direccion: `${barrio.nombre}, Venado Tuerto`,
    capacidad: 10,
    activa: false,
}));

async function upsertUser(users: Collection, filter: Document, data: Document, plainPassword: string, now: Date): Promise<ObjectId> {
    const password = await bcrypt.hash(plainPassword, 10);
    await users.updateOne(
        filter,
        {
            $set: { ...data, updatedAt: now },
            $setOnInsert: { password, puntuacion: 10, suspendidoHasta: null, bloqueado: false, createdAt: now },
        },
        { upsert: true },
    );
    const user = await users.findOne(filter);
    return user!._id as ObjectId;
}

async function seed(): Promise<void> {
    const client = new MongoClient(getMongoConnectionUri(getMongoMode()));
    await client.connect();
    try {
        const db = client.db(getMongoDbName());
        const stationsCollection = db.collection<StationSeedDocument>(COLLECTIONS.stations);
        const bicyclesCollection = db.collection(COLLECTIONS.bicycles);
        const users = db.collection(COLLECTIONS.users);
        const trips = db.collection(COLLECTIONS.trips);
        const maintenances = db.collection(COLLECTIONS.maintenances);
        const now = new Date();

        const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
        const adminId = await upsertUser(users, { email: 'admin@bicicletas.com' }, {
            apellido: 'Sistema', nombre: 'Admin', dni: '10000001', email: 'admin@bicicletas.com', role: 'admin',
        }, adminPassword, now);
        const technicianId = await upsertUser(users, { email: 'tecnico@bicicletas.com' }, {
            apellido: 'Ejemplo', nombre: 'Tecnico', dni: '10000002', email: 'tecnico@bicicletas.com', role: 'tecnico',
        }, adminPassword, now);
        const papuId = await upsertUser(users, { dni: '12345678' }, {
            apellido: '', nombre: 'PAPU', dni: '12345678', email: 'papu@example.com', role: 'cliente',
        }, 'papu1234', now);

        const exampleBicycles: Array<{ _id: ObjectId; stationId: string }> = [];
        for (const stationData of stations) {
            let station = await stationsCollection.findOne({ nombre: stationData.nombre });
            if (!station) {
                const result = await stationsCollection.insertOne({
                    ...stationData,
                    createdAt: now,
                    updatedAt: now,
                });
                station = { ...stationData, _id: result.insertedId as ObjectId };
            } else if (station.lat === undefined || station.lng === undefined) {
                await stationsCollection.updateOne(
                    { _id: station._id },
                    { $set: { lat: stationData.lat, lng: stationData.lng, updatedAt: now } }
                );
            }

            const existingBicycles = await bicyclesCollection.countDocuments({ estacion_id: station._id.toString() });
            for (let i = 1; i <= 10 && existingBicycles === 0; i++) {
                const codigo = `${stationData.nombre.toUpperCase().replace(' ', '-')}-${String(i).padStart(2, '0')}`;
                await bicyclesCollection.updateOne(
                    { codigo },
                    {
                        $setOnInsert: {
                            codigo,
                            modelo: 'Urbana Aro 26',
                            ubicacion: stationData.nombre,
                            estado: 'DISPONIBLE',
                            estacion_id: station._id.toString(),
                            usuario_id: null,
                            fecha_ultima_revision: null,
                            tecnico_responsable: null,
                            createdAt: now,
                            updatedAt: now,
                        },
                    },
                    { upsert: true },
                );
            }
            const example = await bicyclesCollection.findOne({ codigo: `${stationData.nombre.toUpperCase().replace(' ', '-')}-01` });
            if (example && exampleBicycles.length < 2) exampleBicycles.push({ _id: example._id as ObjectId, stationId: station._id.toString() });
            console.log(`Estación "${stationData.nombre}" y bicicletas verificadas.`);
        }

        for (const neighborhood of inactiveNeighborhoods) {
            await stationsCollection.updateOne(
                { nombre: neighborhood.nombre },
                { $setOnInsert: { ...neighborhood, createdAt: now, updatedAt: now } },
                { upsert: true },
            );
        }

        const [tripBicycle, maintenanceBicycle] = exampleBicycles;
        if (tripBicycle && await trips.countDocuments() === 0) {
            const startedAt = new Date(now.getTime() - 20 * 60 * 1000);
            await trips.insertOne({
                usuario_id: papuId.toString(),
                bicicleta_id: tripBicycle._id.toString(),
                estacion_origen_id: tripBicycle.stationId,
                estacion_destino_id: tripBicycle.stationId,
                fecha_inicio: startedAt,
                fecha_fin: now,
            });
        }
        if (maintenanceBicycle && await maintenances.countDocuments() === 0) {
            await maintenances.insertOne({
                bicicleta_id: maintenanceBicycle._id.toString(),
                estado_anterior: 'EN_MANTENIMIENTO',
                estado_nuevo: 'DISPONIBLE',
                tecnico_id: technicianId.toString(),
                tecnico_responsable: 'Tecnico',
                fecha_actualizacion: now,
            });
        }

        console.log(`Seed completado (admin ${adminId}, tecnico ${technicianId}, PAPU ${papuId}): usuarios, 5 estaciones, 50 bicicletas, 1 viaje y 1 mantenimiento de ejemplo.`);
    } finally {
        await client.close();
    }
}
seed().catch((error: unknown) => {
    console.error('Error al ejecutar seed:', error);
    process.exitCode = 1;
});
