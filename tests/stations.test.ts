import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { Db, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app";

const servers: Server[] = [];
const jwtSecret = "station-tests-secret";
process.env.JWT_SECRET = jwtSecret;
const adminHeaders = {
  authorization: `Bearer ${jwt.sign({ id: "admin-test", nombre: "Admin", role: "admin" }, jwtSecret)}`,
  "content-type": "application/json",
};

function createFakeDb() {
  const collections = new Map<string, Record<string, unknown>[]>();
  return {
    collection(name: string) {
      const documents = collections.get(name) ?? [];
      collections.set(name, documents);
      return {
        find: (filter: Record<string, unknown> = {}) => ({
          toArray: async () =>
            documents.filter((document) =>
              Object.entries(filter).every(([key, value]) => document[key] === value)
            ),
        }),
        findOne: async (filter: Record<string, unknown>) =>
          documents.find((document) =>
            Object.entries(filter).every(([key, value]) =>
              key === "_id" && value instanceof ObjectId
                ? (document[key] as ObjectId | undefined)?.equals(value)
                : document[key] === value
            )
          ) ?? null,
        insertOne: async (document: Record<string, unknown>) => {
          const _id = new ObjectId();
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

async function startServer() {
  const fakeDb = createFakeDb() as unknown as Db;
  const server = createApp(fakeDb).listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
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
});

test("station CRUD endpoints validate inputs and preserve the Spanish API paths", async () => {
  const baseUrl = await startServer();
  const invalid = await fetch(`${baseUrl}/api/estacion`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ nombre: "Centro" }),
  });
  assert.equal(invalid.status, 400);

  const created = await fetch(`${baseUrl}/api/estacion`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      nombre: " Centro ",
      barrio: "Centro",
      direccion: "San Martín y Belgrano",
      lat: -33.7456,
      lng: -61.9688,
      capacidad: 10,
    }),
  });
  const station = await created.json();
  assert.equal(created.status, 201);
  assert.equal(station.nombre, "Centro");
  assert.equal(station.activa, true);
  assert.equal(typeof station.id, "string");

  const list = await fetch(`${baseUrl}/api/estaciones`);
  const stations = await list.json();
  assert.equal(list.status, 200);
  assert.equal(stations.length, 1);
  assert.equal(stations[0].total_bicicletas, 0);

  const detail = await fetch(`${baseUrl}/api/estacion/${station.id}`);
  const detailData = await detail.json();
  assert.equal(detail.status, 200);
  assert.deepEqual(detailData.bicicletas, []);

  const updated = await fetch(`${baseUrl}/api/estacion/${station.id}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ capacidad: 12 }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).capacidad, 12);

  const deleted = await fetch(`${baseUrl}/api/estacion/${station.id}`, {
    method: "DELETE",
    headers: adminHeaders,
  });
  assert.equal(deleted.status, 204);
});

test("invalid station IDs and updates are rejected", async () => {
  const baseUrl = await startServer();
  const invalidId = await fetch(`${baseUrl}/api/estacion/not-an-object-id`);
  assert.equal(invalidId.status, 400);

  const invalidUpdate = await fetch(`${baseUrl}/api/estacion/${new ObjectId()}`, {
    method: "PUT",
    headers: adminHeaders,
    body: JSON.stringify({ capacidad: "large" }),
  });
  assert.equal(invalidUpdate.status, 400);
});
