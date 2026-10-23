import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { createApp } from "../src/app";
import { Db, ObjectId } from "mongodb";

const servers: Server[] = [];

function createFakeDb() {
  const collections = new Map<string, Record<string, unknown>[]>();
  return {
    collection(name: string) {
      const documents = collections.get(name) ?? [];
      collections.set(name, documents);
      return {
        find: () => ({ toArray: async () => [...documents] }),
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
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
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

test("bicycle APIs preserve both English and Spanish routes", async () => {
  const { baseUrl } = await startServer();
  const legacy = await fetch(`${baseUrl}/api/bicycles`);
  const spanish = await fetch(`${baseUrl}/api/bicicletas`);

  assert.equal(legacy.status, 200);
  assert.deepEqual((await legacy.json()).data, []);
  assert.equal(spanish.status, 200);
  assert.deepEqual(await spanish.json(), []);
});

test("legacy bicycle creation validates fields and returns both identifiers", async () => {
  const { baseUrl } = await startServer();
  const invalid = await fetch(`${baseUrl}/api/bicycles`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "B-1" }),
  });
  assert.equal(invalid.status, 400);

  const created = await fetch(`${baseUrl}/api/bicycles`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: "B-1",
      currentStation: "Centro",
      unlockCode: "1234",
    }),
  });
  const response = await created.json();
  assert.equal(created.status, 201);
  assert.equal(response.data.code, "B-1");
  assert.equal(response.data._id, response.data.id);
});

test("bicycle request atomically changes an available bicycle to in-use", async () => {
  const { baseUrl } = await startServer();
  const created = await fetch(`${baseUrl}/api/bicycles`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: "B-2",
      currentStation: "Centro",
      unlockCode: "5678",
    }),
  });
  const { data } = await created.json();

  const request = await fetch(`${baseUrl}/api/bicycles/${data.id}/request`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rentedBy: "client@example.com" }),
  });
  const response = await request.json();
  assert.equal(request.status, 200);
  assert.equal(response.data.status, "IN_USE");
  assert.equal(response.data.rentedBy, "client@example.com");
});

test("invalid bicycle IDs are rejected", async () => {
  const { baseUrl } = await startServer();
  const response = await fetch(`${baseUrl}/api/bicycles/invalid-id`);
  assert.equal(response.status, 400);
});
