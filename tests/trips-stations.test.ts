import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { Bicycle } from "../src/bicycles/bicycle.entity";
import { BicycleRepository } from "../src/bicycles/bicycle.repository.interface";
import { Station } from "../src/stations/station.entity";
import { StationRepository } from "../src/stations/station.repository.interface";
import { StationService } from "../src/stations/station.service";
import { Trip } from "../src/trips/trip.entity";
import { TripRepository } from "../src/trips/trip.repository.interface";
import { TripService } from "../src/trips/trip.service";
import { UnlockCode } from "../src/trips/unlock-code.entity";
import { UnlockCodeRepository } from "../src/trips/unlock-code.repository.interface";
import { User } from "../src/users/user.entity";
import { UserRepository } from "../src/users/user.repository.interface";

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

function setup(options: { score?: number; bloqueado?: boolean; stationActive?: boolean } = {}) {
  const stations: Station[] = [
    { id: "s1", nombre: "Centro", barrio: "Centro", direccion: "Belgrano 1", lat: 0, lng: 0, capacidad: 5, activa: options.stationActive ?? true },
    { id: "s2", nombre: "Norte", barrio: "Norte", direccion: "Mitre 2", lat: 0, lng: 0, capacidad: 5, activa: true },
  ];
  const bicycles: Bicycle[] = [
    { id: "b1", codigo: "BIC-1", modelo: "Urbana", ubicacion: "Centro", estado: "DISPONIBLE", estacion_id: "s1", fecha_ultima_revision: null, tecnico_responsable: null },
  ];
  const users = [
    { id: "u1", nombre: "Ana", email: "ana@x.com", bloqueado: options.bloqueado ?? false, role: "cliente", puntuacion: options.score ?? 10, suspendidoHasta: null },
  ] as unknown as User[];
  const trips: Trip[] = [];
  const codes: UnlockCode[] = [];

  const stationRepository = {
    findAll: async () => stations,
    findById: async (id) => stations.find((s) => s.id === id) ?? null,
    create: async (s) => { stations.push({ ...s, id: `s${stations.length + 1}` }); return stations[stations.length - 1]; },
    update: async (id, data) => { const s = stations.find((x) => x.id === id); return s ? Object.assign(s, data) : null; },
    delete: async (id) => { const i = stations.findIndex((s) => s.id === id); if (i < 0) return false; stations.splice(i, 1); return true; },
  } as StationRepository;

  const bicycleRepository = {
    findAll: async () => bicycles,
    findById: async (id) => bicycles.find((b) => b.id === id) ?? null,
    findByCode: async (c) => bicycles.find((b) => b.codigo === c) ?? null,
    findByStation: async (id) => bicycles.filter((b) => b.estacion_id === id),
    create: async (b) => { bicycles.push({ ...b, id: `b${bicycles.length + 1}` }); return bicycles[bicycles.length - 1]; },
    update: async (id, data) => { const b = bicycles.find((x) => x.id === id); return b ? Object.assign(b, data) : null; },
    updateIfStatus: async (id, estado, data) => {
      const b = bicycles.find((x) => x.id === id && x.estado === estado);
      return b ? Object.assign(b, data) : null;
    },
    delete: async () => true,
  } as BicycleRepository;

  const userRepository = {
    findById: async (id: string) => users.find((u) => u.id === id) ?? null,
    update: async (id: string, data: Partial<User>) => { const u = users.find((x) => x.id === id); return u ? Object.assign(u, data) : null; },
  } as unknown as UserRepository;

  const tripRepository = {
    ensureIndexes: async () => undefined,
    create: async (t) => { const trip = { ...t, id: `t${trips.length + 1}` }; trips.push(trip); return trip; },
    findActiveByUser: async (id) => trips.find((t) => t.usuario_id === id && !t.fecha_fin) ?? null,
    findById: async (id) => trips.find((t) => t.id === id) ?? null,
    findAll: async () => trips,
    findHistoryByUser: async (id) => trips.filter((t) => t.usuario_id === id),
    finish: async (id, _u, dest, at) => {
      const t = trips.find((x) => x.id === id && !x.fecha_fin);
      return t ? Object.assign(t, { estacion_destino_id: dest, fecha_fin: at }) : null;
    },
  } as TripRepository;

  const unlockCodeRepository = {
    ensureIndexes: async () => undefined,
    issue: async (c) => { codes.push({ ...c, id: `c${codes.length + 1}`, intentos: 0 }); },
    findActive: async (u, b, now) => codes.find((c) => c.usuario_id === u && c.bicicleta_id === b && c.expira_en > now) ?? null,
    recordFailedAttempt: async (id) => { const c = codes.find((x) => x.id === id); if (c) c.intentos++; },
    consume: async (id, _u, _b, codeHash) => {
      const i = codes.findIndex((c) => c.id === id && c.codigo_hash === codeHash);
      if (i < 0) return false;
      codes.splice(i, 1);
      return true;
    },
  } as UnlockCodeRepository;

  const service = new TripService(tripRepository, bicycleRepository, stationRepository, userRepository, unlockCodeRepository);
  return { service, stations, bicycles, users, trips, codes, stationRepository, bicycleRepository };
}

async function startTrip(ctx: ReturnType<typeof setup>) {
  const { codigo } = await ctx.service.generateUnlockCode("u1", "b1");
  return ctx.service.start("u1", "b1", "s1", codigo);
}

test("viaje: código de desbloqueo de 8 dígitos, guardado solo como hash", async () => {
  const ctx = setup();
  const { codigo, expira_en } = await ctx.service.generateUnlockCode("u1", "b1");
  assert.match(codigo, /^\d{8}$/);
  assert.ok(expira_en.getTime() > Date.now());
  assert.equal(ctx.codes[0].codigo_hash, hash(codigo));
  assert.notEqual(ctx.codes[0].codigo_hash, codigo);
});

test("viaje: inicio correcto deja la bicicleta EN_USO sin estación y el código no se reutiliza", async () => {
  const ctx = setup();
  const { codigo } = await ctx.service.generateUnlockCode("u1", "b1");
  const trip = await ctx.service.start("u1", "b1", "s1", codigo);
  assert.equal(trip.estacion_origen_id, "s1");
  assert.equal(ctx.bicycles[0].estado, "EN_USO");
  assert.equal(ctx.bicycles[0].estacion_id, null);
  await assert.rejects(ctx.service.start("u1", "b1", "s1", codigo), { status: 409 });
});

test("viaje: código incorrecto se rechaza y cuenta el intento", async () => {
  const ctx = setup();
  await ctx.service.generateUnlockCode("u1", "b1");
  await assert.rejects(ctx.service.start("u1", "b1", "s1", "00000000"), { status: 403, message: "El código de desbloqueo no es correcto" });
  assert.equal(ctx.codes[0].intentos, 1);
  assert.equal(ctx.bicycles[0].estado, "DISPONIBLE");
});

test("viaje: no se puede iniciar con cuenta bloqueada, estación inhabilitada o bicicleta no disponible", async () => {
  await assert.rejects(setup({ bloqueado: true }).service.generateUnlockCode("u1", "b1"), { status: 403 });
  await assert.rejects(setup({ stationActive: false }).service.generateUnlockCode("u1", "b1"), { status: 400 });
  const ctx = setup();
  ctx.bicycles[0].estado = "EN_MANTENIMIENTO";
  await assert.rejects(ctx.service.generateUnlockCode("u1", "b1"), { status: 409 });
});

test("viaje: no se permite un segundo viaje en curso", async () => {
  const ctx = setup();
  await startTrip(ctx);
  await assert.rejects(ctx.service.generateUnlockCode("u1", "b1"), { status: 409, message: "Ya tienes un viaje en curso" });
});

test("viaje: devolución a tiempo devuelve la bicicleta a la estación y suma puntos (máx. 10)", async () => {
  const ctx = setup({ score: 8 });
  await startTrip(ctx);
  const result = await ctx.service.finish("u1", "s2");
  assert.equal(result.puntuacion, 9);
  assert.equal(result.bloqueado, false);
  assert.equal(ctx.bicycles[0].estado, "DISPONIBLE");
  assert.equal(ctx.bicycles[0].estacion_id, "s2");
  assert.equal(ctx.bicycles[0].ubicacion, "Norte");

  const capped = setup({ score: 10 });
  await startTrip(capped);
  assert.equal((await capped.service.finish("u1", "s1")).puntuacion, 10);
});

test("viaje: devolución con demora resta puntos, suspende y finalmente bloquea", async () => {
  const late = setup({ score: 5 });
  await startTrip(late);
  late.trips[0].fecha_inicio = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const suspended = await late.service.finish("u1", "s2");
  assert.equal(suspended.puntuacion, 4);
  assert.ok(suspended.suspendidoHasta && suspended.suspendidoHasta.getTime() > Date.now());
  assert.equal(suspended.bloqueado, false);

  const last = setup({ score: 2 });
  await startTrip(last);
  last.trips[0].fecha_inicio = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const blocked = await last.service.finish("u1", "s2");
  assert.equal(blocked.puntuacion, 1);
  assert.equal(blocked.bloqueado, true);
});

test("viaje: finalizar sin viaje activo o a una estación inhabilitada falla", async () => {
  const ctx = setup();
  await assert.rejects(ctx.service.finish("u1", "s2"), { status: 404, message: "No tienes un viaje en curso" });
  await startTrip(ctx);
  ctx.stations[1].activa = false;
  await assert.rejects(ctx.service.finish("u1", "s2"), { status: 400 });
  assert.equal(ctx.bicycles[0].estado, "EN_USO");
});

test("estaciones: el listado incluye totales y el detalle sus bicicletas", async () => {
  const ctx = setup();
  const service = new StationService(ctx.stationRepository, ctx.bicycleRepository);
  const all = await service.getAll();
  const centro = all.find((s) => s.id === "s1") as unknown as { total_bicicletas: number; disponibles: number };
  assert.equal(centro.total_bicicletas, 1);
  assert.equal(centro.disponibles, 1);
  const detail = (await service.getById("s1")) as unknown as { bicicletas: unknown[] };
  assert.equal(detail.bicicletas.length, 1);
  await assert.rejects(service.getById("nope"), { message: "Estación no encontrada" });
});

test("estaciones: validación y no se elimina una estación con bicicletas", async () => {
  const ctx = setup();
  const service = new StationService(ctx.stationRepository, ctx.bicycleRepository);
  await assert.rejects(
    service.create({ nombre: "", barrio: "x", direccion: "y", lat: 0, lng: 0, capacidad: 3, activa: true }),
    { message: "El nombre es obligatorio" }
  );
  await assert.rejects(service.delete("s1"), { message: "No se puede eliminar una estación con bicicletas asignadas" });
  await service.delete("s2");
  assert.equal(ctx.stations.length, 1);
});
