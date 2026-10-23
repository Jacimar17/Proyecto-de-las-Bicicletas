import { Document, MongoClient, ObjectId } from 'mongodb';

interface EstacionSeedDocument extends Document {
    nombre: string;
    barrio: string;
    direccion: string;
    capacidad: number;
    activa: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

const estaciones = [
    { nombre: 'Centro', barrio: 'Centro', direccion: 'San Martín y Belgrano', capacidad: 10, activa: true },
    { nombre: 'San Martín', barrio: 'San Martín', direccion: 'Av. San Martín 1200', capacidad: 10, activa: true },
    { nombre: 'Belgrano', barrio: 'Belgrano', direccion: 'Belgrano y Mitre', capacidad: 10, activa: true },
    { nombre: 'Tiro Federal', barrio: 'Tiro Federal', direccion: 'Av. Circunvalación 500', capacidad: 10, activa: true },
    { nombre: 'Juan XXIII', barrio: 'Juan XXIII', direccion: 'Juan XXIII y Libertad', capacidad: 10, activa: true },
];

async function seed() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
        throw new Error('MONGO_URI must be configured to seed MongoDB Atlas.');
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
                estacion = { ...estacionData, _id: result.insertedId };
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
    console.error('Seed failed:', error);
    process.exitCode = 1;
});
