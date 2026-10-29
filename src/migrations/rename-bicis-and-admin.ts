import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Db, MongoClient } from 'mongodb';
import { getMongoConnectionUri, getMongoDbName, getMongoMode } from '../config/db';
import { COLLECTIONS } from '../config/collections';

// DNI del usuario que recibirá el rol 'admin'. Se puede sobrescribir con la variable ADMIN_DNI.
const ADMIN_DNI = process.env.ADMIN_DNI || '99999999';
// Contraseña inicial, sólo si el usuario todavía no existe.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const NON_OPERATIONAL_STATUSES = ['EN_MANTENIMIENTO', 'NO_APTA'];

async function renameBicycles(db: Db, now: Date): Promise<number> {
    const bicycles = db.collection(COLLECTIONS.bicycles);
    const operational = await bicycles
        .find({ estado: { $nin: NON_OPERATIONAL_STATUSES } })
        .sort({ estacion_id: 1, createdAt: 1, _id: 1 })
        .toArray();

    const width = Math.max(2, String(operational.length).length);
    let counter = 0;
    for (const bicycle of operational) {
        counter++;
        const codigo = `BICI - ${String(counter).padStart(width, '0')}`;
        await bicycles.updateOne(
            { _id: bicycle._id },
            { $set: { codigo, updatedAt: now } },
        );
    }
    return counter;
}

async function assignAdmin(db: Db, now: Date): Promise<'creado' | 'actualizado'> {
    const users = db.collection(COLLECTIONS.users);
    const existing = await users.findOne({ dni: ADMIN_DNI });
    if (existing) {
        await users.updateOne({ _id: existing._id }, { $set: { role: 'admin', bloqueado: false, updatedAt: now } });
        return 'actualizado';
    }
    await users.insertOne({
        nombre: 'Administrador',
        apellido: '',
        dni: ADMIN_DNI,
        email: `admin${ADMIN_DNI}@bicicletas.com`,
        password: await bcrypt.hash(ADMIN_PASSWORD, 10),
        role: 'admin',
        puntuacion: 10,
        suspendidoHasta: null,
        bloqueado: false,
        createdAt: now,
        updatedAt: now,
    });
    return 'creado';
}

async function migrate(): Promise<void> {
    const client = new MongoClient(getMongoConnectionUri(getMongoMode()));
    await client.connect();
    try {
        const db = client.db(getMongoDbName());
        const now = new Date();
        const renamed = await renameBicycles(db, now);
        const adminResult = await assignAdmin(db, now);
        console.log(`Bicicletas operativas renombradas: ${renamed}.`);
        console.log(`Usuario admin (DNI ${ADMIN_DNI}) ${adminResult}.`);
    } finally {
        await client.close();
    }
}

migrate().catch((error: unknown) => {
    console.error('Error al ejecutar la migración:', error);
    process.exitCode = 1;
});
