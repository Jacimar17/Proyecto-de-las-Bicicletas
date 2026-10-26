import 'dotenv/config';
import { Document, MongoClient, ObjectId } from 'mongodb';

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

async function seed(): Promise<void> {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI debe configurarse para cargar datos en MongoDB.');
    }

    const client = new MongoClient(mongoUri);
    await client.connect();
    try {
        const dbName = process.env.MONGO_DB_NAME || 'bicicletas_db';
        const db = client.db(dbName);
        const estacionesCollection = db.collection<EstacionSeedDocument>('estaciones');
        const bicicletasCollection = db.collection('bicicletas');
        const now = new Date();

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

            for (let i = 1; i <= 10; i++) {
                const codigo = `${estacionData.nombre.toUpperCase().replace(' ', '-')}-${String(i).padStart(2, '0')}`;
                await bicicletasCollection.updateOne(
                    { codigo },
                    {
                        $setOnInsert: {
                            codigo,
                            modelo: 'Urbana Aro 26',
                            ubicacion: estacionData.nombre,
                            estado: 'DISPONIBLE',
                            estacion_id: estacion._id.toString(),
                            fecha_ultima_revision: null,
                            tecnico_responsable: null,
                            createdAt: now,
                            updatedAt: now,
                        },
                    },
                    { upsert: true },
                );
            }
            console.log(`Estación "${estacionData.nombre}" y bicicletas verificadas.`);
        }

        console.log('Seed completado: 5 estaciones y 50 bicicletas verificadas sin borrar datos existentes.');
    } finally {
        await client.close();
    }
}

seed().catch((error: unknown) => {
    console.error('Error al ejecutar seed:', error);
    process.exitCode = 1;
});
