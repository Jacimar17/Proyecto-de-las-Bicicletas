import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Db, MongoClient } from 'mongodb';
import { getMongoConnectionUri, getMongoDbName, getMongoMode } from '../config/db';
import { COLLECTIONS } from '../config/collections';

// DNI del usuario que recibirá el rol 'admin'. Se puede sobrescribir con la variable ADMIN_DNI.
const ADMIN_DNI = process.env.ADMIN_DNI || '99999999';
// Contraseña inicial, sólo si el usuario todavía no existe.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const ESTADOS_NO_OPERATIVOS = ['EN_MANTENIMIENTO', 'NO_APTA'];

async function renombrarBicicletas(db: Db, now: Date): Promise<number> {
    const bicicletas = db.collection(COLLECTIONS.bicycles);
    const operativas = await bicicletas
        .find({ estado: { $nin: ESTADOS_NO_OPERATIVOS } })
        .sort({ estacion_id: 1, createdAt: 1, _id: 1 })
        .toArray();

    const ancho = Math.max(2, String(operativas.length).length);
    let contador = 0;
    for (const bicicleta of operativas) {
        contador++;
        const codigo = `BICI - ${String(contador).padStart(ancho, '0')}`;
        await bicicletas.updateOne(
            { _id: bicicleta._id },
            { $set: { codigo, code: codigo, unlockCode: codigo, updatedAt: now } },
        );
    }
    return contador;
}

async function asignarAdmin(db: Db, now: Date): Promise<'creado' | 'actualizado'> {
    const users = db.collection(COLLECTIONS.users);
    const existente = await users.findOne({ dni: ADMIN_DNI });
    if (existente) {
        await users.updateOne({ _id: existente._id }, { $set: { role: 'admin', bloqueado: false, updatedAt: now } });
        return 'actualizado';
    }
    await users.insertOne({
        name: 'Administrador',
        lastName: '',
        nombre: 'Administrador',
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

async function migrar(): Promise<void> {
    const client = new MongoClient(getMongoConnectionUri(getMongoMode()));
    await client.connect();
    try {
        const db = client.db(getMongoDbName());
        const now = new Date();
        const renombradas = await renombrarBicicletas(db, now);
        const resultadoAdmin = await asignarAdmin(db, now);
        console.log(`Bicicletas operativas renombradas: ${renombradas}.`);
        console.log(`Usuario admin (DNI ${ADMIN_DNI}) ${resultadoAdmin}.`);
    } finally {
        await client.close();
    }
}

migrar().catch((error: unknown) => {
    console.error('Error al ejecutar la migración:', error);
    process.exitCode = 1;
});
