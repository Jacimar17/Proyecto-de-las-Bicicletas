import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Collection, Document, MongoClient, ObjectId } from 'mongodb';
import { getMongoConnectionUri, getMongoDbName, getMongoMode } from './config/db';
import { COLLECTIONS } from './config/collections';
import { mirrorBicycleFields } from './bicycles/bicycle-fields';

interface EstacionSeedDocument extends Document {
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

const estaciones = [
    { nombre: 'Centro', barrio: 'Centro', direccion: 'San Martín y Belgrano', lat: -33.7456, lng: -61.9688, capacidad: 10, activa: true },
    { nombre: 'San Martín', barrio: 'San Martín', direccion: 'Av. San Martín 1200', lat: -33.7420, lng: -61.9720, capacidad: 10, activa: true },
    { nombre: 'Belgrano', barrio: 'Belgrano', direccion: 'Belgrano y Mitre', lat: -33.7500, lng: -61.9640, capacidad: 10, activa: true },
    { nombre: 'Tiro Federal', barrio: 'Tiro Federal', direccion: 'Av. Circunvalación 500', lat: -33.7380, lng: -61.9560, capacidad: 10, activa: true },
    { nombre: 'Juan XXIII', barrio: 'Juan XXIII', direccion: 'Juan XXIII y Libertad', lat: -33.7550, lng: -61.9800, capacidad: 10, activa: true },
];

// Barrios de Venado Tuerto: coordenadas aproximadas, inicializados como estaciones no habilitadas.
const barriosInactivos = [
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
        const estacionesCollection = db.collection<EstacionSeedDocument>(COLLECTIONS.stations);
        const bicicletasCollection = db.collection(COLLECTIONS.bicycles);
        const users = db.collection(COLLECTIONS.users);
        const trips = db.collection(COLLECTIONS.trips);
        const maintenances = db.collection(COLLECTIONS.maintenances);
        const now = new Date();

        const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
        const adminId = await upsertUser(users, { email: 'admin@bicicletas.com' }, {
            name: 'Admin', lastName: 'Sistema', nombre: 'Admin', dni: '10000001', email: 'admin@bicicletas.com', role: 'admin',
        }, adminPassword, now);
        const tecnicoId = await upsertUser(users, { email: 'tecnico@bicicletas.com' }, {
            name: 'Tecnico', lastName: 'Ejemplo', nombre: 'Tecnico', dni: '10000002', email: 'tecnico@bicicletas.com', role: 'tecnico',
        }, adminPassword, now);
        const papuId = await upsertUser(users, { dni: '12345678' }, {
            name: 'PAPU', lastName: '', nombre: 'PAPU', dni: '12345678', email: 'papu@example.com', role: 'cliente',
        }, 'papu1234', now);

        const bicicletasEjemplo: Array<{ _id: ObjectId; estacionId: string }> = [];
        for (const estacionData of estaciones) {
            let estacion = await estacionesCollection.findOne({ nombre: estacionData.nombre });
            if (!estacion) {
                const result = await estacionesCollection.insertOne({
                    ...estacionData,
                    createdAt: now,
                    updatedAt: now,
                });
                estacion = { ...estacionData, _id: result.insertedId as ObjectId };
            } else if (estacion.lat === undefined || estacion.lng === undefined) {
                await estacionesCollection.updateOne(
                    { _id: estacion._id },
                    { $set: { lat: estacionData.lat, lng: estacionData.lng, updatedAt: now } }
                );
            }

            const bicisExistentes = await bicicletasCollection.countDocuments({ estacion_id: estacion._id.toString() });
            for (let i = 1; i <= 10 && bicisExistentes === 0; i++) {
                const codigo = `${estacionData.nombre.toUpperCase().replace(' ', '-')}-${String(i).padStart(2, '0')}`;
                await bicicletasCollection.updateOne(
                    { codigo },
                    {
                        $setOnInsert: mirrorBicycleFields({
                            codigo,
                            unlockCode: codigo,
                            modelo: 'Urbana Aro 26',
                            ubicacion: estacionData.nombre,
                            estado: 'DISPONIBLE',
                            estacion_id: estacion._id.toString(),
                            usuario_id: null,
                            fecha_ultima_revision: null,
                            tecnico_responsable: null,
                            createdAt: now,
                            updatedAt: now,
                        }),
                    },
                    { upsert: true },
                );
            }
            const ejemplo = await bicicletasCollection.findOne({ codigo: `${estacionData.nombre.toUpperCase().replace(' ', '-')}-01` });
            if (ejemplo && bicicletasEjemplo.length < 2) bicicletasEjemplo.push({ _id: ejemplo._id as ObjectId, estacionId: estacion._id.toString() });
            console.log(`Estación "${estacionData.nombre}" y bicicletas verificadas.`);
        }

        for (const barrio of barriosInactivos) {
            await estacionesCollection.updateOne(
                { nombre: barrio.nombre },
                { $setOnInsert: { ...barrio, createdAt: now, updatedAt: now } },
                { upsert: true },
            );
        }

        const [bicicletaViaje, bicicletaMantenimiento] = bicicletasEjemplo;
        if (bicicletaViaje && await trips.countDocuments() === 0) {
            const inicio = new Date(now.getTime() - 20 * 60 * 1000);
            await trips.insertOne({
                usuario_id: papuId.toString(),
                bicicleta_id: bicicletaViaje._id.toString(),
                estacion_origen_id: bicicletaViaje.estacionId,
                estacion_destino_id: bicicletaViaje.estacionId,
                fecha_inicio: inicio,
                fecha_fin: now,
            });
        }
        if (bicicletaMantenimiento && await maintenances.countDocuments() === 0) {
            await maintenances.insertOne({
                bicicleta_id: bicicletaMantenimiento._id.toString(),
                estado_anterior: 'EN_MANTENIMIENTO',
                estado_nuevo: 'DISPONIBLE',
                tecnico_id: tecnicoId.toString(),
                tecnico_responsable: 'Tecnico',
                fecha_actualizacion: now,
            });
        }

        console.log(`Seed completado (admin ${adminId}, tecnico ${tecnicoId}, PAPU ${papuId}): usuarios, 5 estaciones, 50 bicicletas, 1 viaje y 1 mantenimiento de ejemplo.`);
    } finally {
        await client.close();
    }
}
seed().catch((error: unknown) => {
    console.error('Error al ejecutar seed:', error);
    process.exitCode = 1;
});
