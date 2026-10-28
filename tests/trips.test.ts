import assert from "node:assert/strict";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { afterEach, test } from "node:test";
import jwt from "jsonwebtoken";
import { Db, ObjectId } from "mongodb";
import { createApp } from "../src/app";

const servers: Server[] = [];

function createFakeDb() {
  const collections = new Map<string, Record<string, unknown>[]>();
  return {
    collection(name: string) {
      const documents = collections.get(name) ?? [];
      collections.set(name, documents);
      return {
        find: (filter: Record<string, unknown> = {}) => {
          const query = {
            sort: () => query,
            toArray: async () =>
              documents.filter((document) =>
                Object.entries(filter).every(([key, value]) => document[key] === value)
              ),
          };
          return query;
        },
        findOne: async (filter: Record<string, unknown>) =>
          documents.find((document) =>
            Object.entries(filter).every(([key, value]) =>
              key === "_id" && value instanceof ObjectId
                ? (document[key] as ObjectId | undefined)?.equals(value)
                : document[key] === value
            )
          ) ?? null,
        insertOne: async (document: Record<string, unknown>) => {
          const _id = (document._id as ObjectId | undefined) ?? new ObjectId();
          documents.push({ ...document, _id });
          return { acknowledged: true, insertedId: _id };
        },
        findOneAndUpdate: async (
          filter: Record<string, unknown>,
          update: { $set: Record<string, unknown> }
        ) => {
          const document = documents.find((entry) =>
            Object.entries(filter).every(([key, value]) =>
              key === "_id" && value instanceof ObjectId
                ? (entry[key] as ObjectId | undefined)?.equals(value)
                : entry[key] === value
            )
          );
          if (!document) return null;
          Object.assign(document, update.$set);
          return document;
        },
        deleteOne: async (filter: Record<string, unknown>) => {
          const index = documents.findIndex((document) =>
            Object.entries(filter).every(([key, value]) =>
              key === "_id" && value instanceof ObjectId
                ? (document[key] as ObjectId | undefined)?.equals(value)
                : document[key] === value
            )
          );
          if (index < 0) return { deletedCount: 0 };
          documents.splice(index, 1);
          return { deletedCount: 1 };
        },
      };
    },
  };
}

async function startServer(score = 10, accountCollection: "users" | "usuarios" = "users") {
  process.env.JWT_SECRET = "test-secret-for-trip-tests";
  const fakeDb = createFakeDb();
  const userId = new ObjectId();
  await fakeDb.collection(accountCollection === "usuarios" ? "users" : accountCollection).insertOne({
    _id: userId,
    puntuacion: score,
    suspendidoHasta: null,
    bloqueado: false,
    role: "cliente",
  });
  const db = fakeDb as unknown as Db;
  const server = createApp(db).listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    token: jwt.sign({
      id: userId.toString(),
      name: "Cliente",
      nombre: "Cliente",
      role: "cliente",
      accountCollection,
    }, process.env.JWT_SECRET),
    adminHeaders: {
      authorization: `Bearer ${jwt.sign({
        id: new ObjectId().toString(),
        name: "Admin",
        nombre: "Admin",
        role: "admin",
      }, process.env.JWT_SECRET)}`,
      "content-type": "application/json",
    },
    fakeDb,
    userId,
  };
}

async function createStationAndBicycle(
  baseUrl: string,
  headers: Record<string, string>,
  stationName: string,
  bicycleCode: string
) {
  const stationResponse = await fetch(`${baseUrl}/api/estacion`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nombre: stationName,
      barrio: stationName,
      direccion: `Calle ${stationName}`,
      capacidad: 10,
      lat: -34,
      lng: -58,
    }),
  });
  const station = await stationResponse.json();
  const bicycleResponse = await fetch(`${baseUrl}/api/bicicleta`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      codigo: bicycleCode,
      modelo: "Urbana",
      ubicacion: stationName,
      estado: "DISPONIBLE",
      estacion_id: station.id,
    }),
  });
  const bicycle = await bicycleResponse.json();
  return { station, bicycle };
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve()))
        )
    )
  );
  delete process.env.JWT_SECRET;
});

test("authenticated client can start, return, and review a trip", async () => {
  const { baseUrl, token, adminHeaders } = await startServer(9);
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };

  const originResponse = await fetch(`${baseUrl}/api/estacion`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      nombre: "Centro",
      barrio: "Centro",
      direccion: "Calle 1",
      capacidad: 10,
      lat: -34,
      lng: -58,
    }),
  });
  const origin = await originResponse.json();
  const destinationResponse = await fetch(`${baseUrl}/api/estacion`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      nombre: "Norte",
      barrio: "Norte",
      direccion: "Calle 2",
      capacidad: 10,
      lat: -34,
      lng: -58,
    }),
  });
  const destination = await destinationResponse.json();
  const bicycleResponse = await fetch(`${baseUrl}/api/bicicleta`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      codigo: "B-101",
      modelo: "Urbana",
      ubicacion: "Centro",
      estado: "DISPONIBLE",
      estacion_id: origin.id,
    }),
  });
  const bicycle = await bicycleResponse.json();

  const start = await fetch(`${baseUrl}/api/viajes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ bicicletaId: bicycle.id }),
  });
  const started = await start.json();
  assert.equal(start.status, 201);
  assert.equal(started.data.estacionOrigenId, origin.id);
  assert.ok(started.data.fechaInicio);

  const bicyclesResponse = await fetch(`${baseUrl}/api/bicicletas`);
  const activeBicycle = (await bicyclesResponse.json()).find((item: { id: string }) => item.id === bicycle.id);
  assert.equal(activeBicycle.estado, "EN_USO");

  const finish = await fetch(`${baseUrl}/api/viajes/${started.data.id}/devolver`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estacionDestinoId: destination.id }),
  });
  const finished = await finish.json();
  assert.equal(finish.status, 200);
  assert.equal(finished.data.estacionDestinoId, destination.id);
  assert.ok(finished.data.fechaFin);

  const historyResponse = await fetch(`${baseUrl}/api/viajes/mis-viajes`, { headers });
  const history = await historyResponse.json();
  assert.equal(historyResponse.status, 200);
  assert.equal(history.length, 1);
  assert.equal(history[0].estacionOrigenId, origin.id);
  assert.equal(history[0].estacionDestinoId, destination.id);
  assert.equal(history[0].fechaInicio, started.data.fechaInicio);
  assert.equal(history[0].fechaFin, finished.data.fechaFin);
  assert.equal(finished.puntuacion, 10);

  const destinationDetail = await fetch(`${baseUrl}/api/estacion/${destination.id}`);
  const returnedBicycle = (await destinationDetail.json()).bicicletas[0];
  assert.equal(returnedBicycle.estado, "DISPONIBLE");
  assert.equal(returnedBicycle.estacion_id, destination.id);
});

test("slow rides subtract a point, suspend at four, and block further rentals during suspension", async () => {
  const { baseUrl, token, fakeDb, userId, adminHeaders } = await startServer(5);
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  const { station, bicycle } = await createStationAndBicycle(baseUrl, adminHeaders, "Centro", "B-201");
  const start = await fetch(`${baseUrl}/api/viajes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ bicicletaId: bicycle.id }),
  });
  const started = await start.json();
  const startedAt = new Date(Date.now() - 3 * 60 * 60 * 1000 - 1);
  await fakeDb.collection("trips").findOneAndUpdate(
    { _id: new ObjectId(started.data.id) },
    { $set: { fecha_inicio: startedAt } }
  );

  const finish = await fetch(`${baseUrl}/api/viajes/${started.data.id}/devolver`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estacionDestinoId: station.id }),
  });
  const finished = await finish.json();
  assert.equal(finish.status, 200);
  assert.equal(finished.puntuacion, 4);
  assert.equal(finished.bloqueado, false);
  assert.ok(new Date(finished.suspendidoHasta).getTime() > Date.now());

  const blockedStart = await fetch(`${baseUrl}/api/viajes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ bicicletaId: bicycle.id }),
  });
  assert.equal(blockedStart.status, 403);

  const storedUser = await fakeDb.collection("users").findOne({ _id: userId });
  assert.equal(storedUser?.puntuacion, 4);
});

test("reaching one point permanently blocks the account from starting trips", async () => {
  const { baseUrl, token, fakeDb, userId, adminHeaders } = await startServer(2);
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  const { station, bicycle } = await createStationAndBicycle(baseUrl, adminHeaders, "Oeste", "B-202");
  const start = await fetch(`${baseUrl}/api/viajes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ bicicletaId: bicycle.id }),
  });
  const started = await start.json();
  await fakeDb.collection("trips").findOneAndUpdate(
    { _id: new ObjectId(started.data.id) },
    { $set: { fecha_inicio: new Date(Date.now() - 4 * 60 * 60 * 1000) } }
  );
  const finish = await fetch(`${baseUrl}/api/viajes/${started.data.id}/devolver`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estacionDestinoId: station.id }),
  });
  const finished = await finish.json();
  assert.equal(finish.status, 200);
  assert.equal(finished.puntuacion, 1);
  assert.equal(finished.bloqueado, true);

  const blockedStart = await fetch(`${baseUrl}/api/viajes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ bicicletaId: bicycle.id }),
  });
  assert.equal(blockedStart.status, 403);

  const storedUser = await fakeDb.collection("users").findOne({ _id: userId });
  assert.equal(storedUser?.bloqueado, true);
});

test("the trip score updates accounts created through the Spanish usuario API", async () => {
  const { baseUrl, token, fakeDb, userId, adminHeaders } = await startServer(9, "usuarios");
  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  const { station, bicycle } = await createStationAndBicycle(baseUrl, adminHeaders, "Este", "B-203");
  const start = await fetch(`${baseUrl}/api/viajes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ bicicletaId: bicycle.id }),
  });
  const started = await start.json();
  const finish = await fetch(`${baseUrl}/api/viajes/${started.data.id}/devolver`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estacionDestinoId: station.id }),
  });
  const finished = await finish.json();

  assert.equal(finish.status, 200);
  assert.equal(finished.puntuacion, 10);
  const storedUser = await fakeDb.collection("users").findOne({ _id: userId });
  assert.equal(storedUser?.puntuacion, 10);
});

test("trip endpoints require authentication and reject disabled return stations", async () => {
  const { baseUrl, token, adminHeaders } = await startServer();
  const unauthenticated = await fetch(`${baseUrl}/api/viajes/mis-viajes`);
  assert.equal(unauthenticated.status, 401);

  const headers = {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
  const originResponse = await fetch(`${baseUrl}/api/estacion`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      nombre: "Sur",
      barrio: "Sur",
      direccion: "Calle 3",
      capacidad: 10,
      lat: -34,
      lng: -58,
    }),
  });
  const origin = await originResponse.json();
  const disabledResponse = await fetch(`${baseUrl}/api/estacion`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      nombre: "Cerrada",
      barrio: "Centro",
      direccion: "Calle 4",
      capacidad: 10,
      lat: -34,
      lng: -58,
    }),
  });
  const disabled = await disabledResponse.json();
  await fetch(`${baseUrl}/api/estacion/${disabled.id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ activa: false }),
  });
  const bicycleResponse = await fetch(`${baseUrl}/api/bicicleta`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      codigo: "B-102",
      modelo: "Urbana",
      ubicacion: "Sur",
      estado: "DISPONIBLE",
      estacion_id: origin.id,
    }),
  });
  const bicycle = await bicycleResponse.json();
  const start = await fetch(`${baseUrl}/api/viajes`, {
    method: "POST",
    headers,
    body: JSON.stringify({ bicicletaId: bicycle.id }),
  });
  const started = await start.json();

  const finish = await fetch(`${baseUrl}/api/viajes/${started.data.id}/devolver`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ estacionDestinoId: disabled.id }),
  });
  assert.equal(finish.status, 400);
});
