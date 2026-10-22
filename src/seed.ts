import { MongoClient } from 'mongodb';
import 'dotenv/config';

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME;

const estaciones = [
    { nombre: 'Centro', barrio: 'Centro', direccion: 'San Martín y Belgrano', lat: -33.7456, lng: -61.9688, capacidad: 10, activa: true },
    { nombre: 'San Martín', barrio: 'San Martín', direccion: 'Av. San Martín 1200', lat: -33.7420, lng: -61.9720, capacidad: 10, activa: true },
    { nombre: 'Belgrano', barrio: 'Belgrano', direccion: 'Belgrano y Mitre', lat: -33.7500, lng: -61.9640, capacidad: 10, activa: true },
    { nombre: 'Tiro Federal', barrio: 'Tiro Federal', direccion: 'Av. Circunvalación 500', lat: -33.7380, lng: -61.9560, capacidad: 10, activa: true },
    { nombre: 'Juan XXIII', barrio: 'Juan XXIII', direccion: 'Juan XXIII y Libertad', lat: -33.7550, lng: -61.9800, capacidad: 10, activa: true },
];

async function seed() {
    if (!MONGO_URI || !DB_NAME) throw new Error('MONGO_URI y MONGO_DB_NAME deben estar configurados');
    const client = new MongoClient(MONGO_URI);
    try {
        await client.connect();
        const db = client.db(DB_NAME);

        await db.collection('estaciones').deleteMany({});
        await db.collection('bicicletas').deleteMany({});

        console.log('Insertando estaciones...');
        const now = new Date();

        for (const estacionData of estaciones) {
            const estacion = await db.collection('estaciones').insertOne({
                ...estacionData,
                createdAt: now,
                updatedAt: now,
            });

            const estacion_id = estacion.insertedId.toString();
            const bicicletas = [];

            for (let i = 1; i <= 10; i++) {
                const codigo = `${estacionData.nombre.toUpperCase().replace(' ', '-')}-${String(i).padStart(2, '0')}`;
                bicicletas.push({
                    codigo,
                    modelo: 'Urbana Aro 26',
                    ubicacion: estacionData.nombre,
                    estado: 'DISPONIBLE',
                    estacion_id,
                    fecha_ultima_revision: null,
                    tecnico_responsable: null,
                    createdAt: now,
                    updatedAt: now,
                });
            }

            await db.collection('bicicletas').insertMany(bicicletas);
            console.log(`Estación "${estacionData.nombre}" creada con 10 bicicletas`);
        }

        console.log('\nSeed completado: 5 estaciones, 50 bicicletas');
    } finally {
        await client.close();
    }
}

seed().catch((error: unknown) => {
    console.error('Error al ejecutar el seed:', error);
    process.exitCode = 1;
});
