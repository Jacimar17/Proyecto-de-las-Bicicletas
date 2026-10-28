import assert from 'node:assert/strict';
import test from 'node:test';
import { Bicicleta, EstadoBicicleta } from '../src/bicycles/bicicleta.entity';
import { BicicletaRepository } from '../src/bicycles/bicicleta.repository.interface';
import { Estacion } from '../src/estacion/estacion.entity';
import { EstacionRepository } from '../src/estacion/estacion.repository.interface';
import { ApiError } from '../src/common/api-error';
import { MantenimientoRepository } from '../src/mantenimiento/mantenimiento.repository.interface';
import { Mantenimiento } from '../src/mantenimiento/mantenimiento.entity';
import { MantenimientoService } from '../src/mantenimiento/mantenimiento.service';
import { Viaje } from '../src/viaje/viaje.entity';
import { ViajeRepository } from '../src/viaje/viaje.repository.interface';
import { ViajeService } from '../src/viaje/viaje.service';
import { User } from '../src/users/user.entity';
import { UserRepository } from '../src/users/user.repository.interface';
import { Usuario } from '../src/usuario/usuario.entity';
import { UsuarioRepository } from '../src/usuario/usuario.repository.interface';

const stationA: Estacion = {
    id: 'station-a', nombre: 'Centro', barrio: 'Centro', direccion: 'Calle 1',
    lat: -33.7, lng: -61.9, capacidad: 10, activa: true
};
const stationB: Estacion = {
    id: 'station-b', nombre: 'Norte', barrio: 'Norte', direccion: 'Calle 2',
    lat: -33.6, lng: -61.8, capacidad: 10, activa: true
};

function makeBikeRepository(initialState: EstadoBicicleta = 'DISPONIBLE'): BicicletaRepository {
    let bicycle: Bicicleta = {
        id: 'bike-1',
        codigo: 'BICI-001',
        modelo: 'Urbana',
        ubicacion: stationA.nombre,
        estado: initialState,
        estacion_id: initialState === 'EN_USO' ? null : stationA.id!,
        fecha_ultima_revision: null,
        tecnico_responsable: null
    };
    return {
        findAll: async () => [bicycle],
        findById: async id => id === bicycle.id ? { ...bicycle } : null,
        findByCodigo: async codigo => codigo === bicycle.codigo ? { ...bicycle } : null,
        findByEstacion: async id => bicycle.estacion_id === id ? [{ ...bicycle }] : [],
        create: async data => ({ ...data, id: 'bike-new' }),
        update: async (id, data) => {
            if (id !== bicycle.id) return null;
            bicycle = { ...bicycle, ...data };
            return { ...bicycle };
        },
        updateIfEstado: async (id, estado, data) => {
            if (id !== bicycle.id || bicycle.estado !== estado) return null;
            bicycle = { ...bicycle, ...data };
            return { ...bicycle };
        },
        delete: async id => id === bicycle.id
    };
}

function makeStationRepository(): EstacionRepository {
    const stations = [stationA, stationB];
    return {
        findAll: async () => stations,
        findById: async id => stations.find(station => station.id === id) ?? null,
        create: async station => ({ ...station, id: 'station-new' }),
        update: async () => null,
        delete: async () => false
    };
}

function makeTripRepository(): ViajeRepository {
    const trips: Viaje[] = [];
    return {
        ensureIndexes: async () => undefined,
        create: async trip => {
            const created = { ...trip, id: `trip-${trips.length + 1}` };
            trips.push(created);
            return created;
        },
        findActiveByUser: async userId =>
            trips.find(trip => trip.usuario_id === userId && trip.fecha_fin === null) ?? null,
        findById: async id => trips.find(trip => trip.id === id) ?? null,
        findHistoryByUser: async userId => trips.filter(trip => trip.usuario_id === userId),
        finish: async (id, userId, destinationId, date) => {
            const trip = trips.find(item => item.id === id && item.usuario_id === userId && item.fecha_fin === null);
            if (!trip) return null;
            trip.estacion_destino_id = destinationId;
            trip.fecha_fin = date;
            return { ...trip };
        }
    };
}

function makeAccountRepositories(): { users: UserRepository; usuarios: UsuarioRepository } {
    const user: User = {
        id: 'user-1', name: 'Cliente', lastName: '', email: 'cliente@example.com',
        password: 'hashed', role: 'cliente', puntuacion: 10, bloqueado: false
    };
    const usuario: Usuario = {
        id: 'user-1', dni: '12345678', nombre: 'Cliente', email: 'cliente@example.com',
        password: 'hashed', role: 'cliente', puntuacion: 10, bloqueado: false
    };
    return {
        users: {
            findAll: async () => [user],
            findById: async id => id === user.id ? { ...user } : null,
            findByEmail: async () => null,
            findByDni: async () => null,
            findByName: async () => null,
            create: async data => ({ ...data, id: 'user-2' }),
            update: async (id, data) => {
                if (id !== user.id) return null;
                Object.assign(user, data);
                return { ...user };
            },
            delete: async () => false
        },
        usuarios: {
            findAll: async () => [usuario],
            findById: async id => id === usuario.id ? { ...usuario } : null,
            findByDni: async () => null,
            findByEmail: async () => null,
            create: async data => ({ ...data, id: 'usuario-2' }),
            update: async (id, data) => {
                if (id !== usuario.id) return null;
                Object.assign(usuario, data);
                return { ...usuario };
            },
            delete: async () => false,
            ensureIndexes: async () => undefined
        }
    };
}

test('el cliente inicia y devuelve un viaje en otra estación, con estado e historial coherentes', async () => {
    const bicycles = makeBikeRepository();
    const trips = makeTripRepository();
    const accounts = makeAccountRepositories();
    const service = new ViajeService(trips, bicycles, makeStationRepository(), accounts.usuarios, accounts.users);

    const active = await service.start('user-1', 'bike-1', stationA.id!);
    assert.equal(active.estacion_origen_id, stationA.id);
    assert.ok(active.fecha_inicio instanceof Date);
    assert.equal((await bicycles.findById('bike-1'))?.estado, 'EN_USO');
    assert.equal((await bicycles.findById('bike-1'))?.estacion_id, null);

    const completed = await service.finish('user-1', stationB.id!);
    assert.equal(completed.estacion_destino_id, stationB.id);
    assert.ok(completed.fecha_fin instanceof Date);
    assert.equal(completed.puntuacion, 10);
    assert.equal((await bicycles.findById('bike-1'))?.estado, 'DISPONIBLE');
    assert.equal((await bicycles.findById('bike-1'))?.estacion_id, stationB.id);
    assert.equal((await service.getHistory('user-1')).length, 1);
});

test('rechaza alquilar bicicletas en mantenimiento', async () => {
    const accounts = makeAccountRepositories();
    const service = new ViajeService(
        makeTripRepository(),
        makeBikeRepository('EN_MANTENIMIENTO'),
        makeStationRepository(),
        accounts.usuarios,
        accounts.users
    );

    await assert.rejects(
        service.start('user-1', 'bike-1', stationA.id!),
        (error: unknown) => error instanceof ApiError && error.status === 409
    );
});

test('el mantenimiento registra el técnico y bloquea el alquiler', async () => {
    const bicycles = makeBikeRepository();
    const records: Mantenimiento[] = [];
    const maintenanceRepository: MantenimientoRepository = {
        create: async record => {
            const saved = { ...record, id: `maintenance-${records.length + 1}` };
            records.push(saved);
            return saved;
        },
        findAll: async () => records
    };
    const service = new MantenimientoService(maintenanceRepository, bicycles);

    const record = await service.updateEstado('bike-1', 'EN_MANTENIMIENTO', {
        id: 'technician-1',
        nombre: 'Técnico'
    });

    assert.equal(record.estado_anterior, 'DISPONIBLE');
    assert.equal(record.estado_nuevo, 'EN_MANTENIMIENTO');
    assert.equal(record.tecnico_id, 'technician-1');
    assert.ok(record.fecha_actualizacion instanceof Date);
    assert.equal((await bicycles.findById('bike-1'))?.estado, 'EN_MANTENIMIENTO');
});

test('rechaza cambiar a mantenimiento una bicicleta en uso', async () => {
    const records: Mantenimiento[] = [];
    const repository: MantenimientoRepository = {
        create: async record => { records.push(record); return record; },
        findAll: async () => records
    };
    const service = new MantenimientoService(repository, makeBikeRepository('EN_USO'));

    await assert.rejects(
        service.updateEstado('bike-1', 'EN_MANTENIMIENTO', { id: 'technician-1', nombre: 'Técnico' }),
        (error: unknown) => error instanceof ApiError && error.status === 409
    );
    assert.equal(records.length, 0);
});
