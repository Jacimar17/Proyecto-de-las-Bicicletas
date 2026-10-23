import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB_NAME || 'bicicletas_db';

const estaciones = [
    { nombre: 'Centro', barrio: 'Centro', direccion: 'San Martín y Belgrano', capacidad: 10, activa: true },
    { nombre: 'San Martín', barrio: 'San Martín', direccion: 'Av. San Martín 1200', capacidad: 10, activa: true },
    { nombre: 'Belgrano', barrio: 'Belgrano', direccion: 'Belgrano y Mitre', capacidad: 10, activa: true },
    { nombre: 'Tiro Federal', barrio: 'Tiro Federal', direccion: 'Av. Circunvalación 500', capacidad: 10, activa: true },
    { nombre: 'Juan XXIII', barrio: 'Juan XXIII', direccion: 'Juan XXIII y Libertad', capacidad: 10, activa: true },
];

async function seed() {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db(DB_NAME);

    // Limpiar colecciones
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
        console.log(`✓ Estación "${estacionData.nombre}" creada con 10 bicicletas`);
    }

    console.log('\n✅ Seed completado: 5 estaciones, 50 bicicletas');
    await client.close();
}

seed().catch(console.error);
