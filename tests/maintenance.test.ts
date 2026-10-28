import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AddressInfo } from "node:net";
import { Server } from "node:http";
import jwt from "jsonwebtoken";
import { Db, ObjectId } from "mongodb";
import { createApp } from "../src/app";

process.env.JWT_SECRET = "test-only-secret";

const servers: Server[] = [];

function createFakeDb() {
  const bicycles: Record<string, unknown>[] = [];
  return {
    collection() {
      return {
        find: () => ({ toArray: async () => bicycles }),
        findOne: async (filter: Record<string, unknown>) =>
          bicycles.find((bicycle) =>
            (bicycle._id as ObjectId | undefined)?.equals(filter._id as ObjectId)
          ) ?? null,
        findOneAndUpdate: async (
          filter: Record<string, unknown>,
          update: { $set: Record<string, unknown> }
        ) => {
          const bicycle = bicycles.find((entry) =>
            (entry._id as ObjectId | undefined)?.equals(filter._id as ObjectId)
          );
          if (!bicycle) return null;
          Object.assign(bicycle, update.$set);
          return bicycle;
        },
        insertOne: async (data: Record<string, unknown>) => {
          const _id = new ObjectId();
          bicycles.push({ ...data, _id });
          return { insertedId: _id, acknowledged: true };
        },
        deleteOne: async () => ({ deletedCount: 0 }),
      };
    },
  };
}

async function startServer() {
  const server = createApp(createFakeDb() as unknown as Db).listen(0);
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

test("maintenance endpoints require an admin token and update bicycle state", async () => {
  const baseUrl = await startServer();
  const token = jwt.sign({ id: "admin-id", role: "admin" }, process.env.JWT_SECRET!);
  const created = await fetch(`${baseUrl}/api/bicycles`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({
      code: "MAINT-1",
      currentStation: "Centro",
      unlockCode: "1234",
    }),
  });
  const { data } = await created.json();
  const bicycleId = data.id as string;

  const unauthenticated = await fetch(`${baseUrl}/api/maintenance/${bicycleId}/suitable`, {
    method: "PATCH",
  });
  assert.equal(unauthenticated.status, 401);

  const customerToken = jwt.sign({ id: "client-id", role: "cliente" }, process.env.JWT_SECRET!);
  const forbidden = await fetch(`${baseUrl}/api/maintenance/${bicycleId}/suitable`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${customerToken}` },
  });
  assert.equal(forbidden.status, 403);

  const updated = await fetch(`${baseUrl}/api/maintenance/${bicycleId}/not-suitable`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}` },
  });
  const result = await updated.json();
  assert.equal(updated.status, 200);
  assert.equal(result.data.status, "NOT_SUITABLE");
  assert.ok(result.data.lastMaintenanceDate);
});

test("maintenance GET requires staff and rejects malformed IDs", async () => {
  const baseUrl = await startServer();
  const url = `${baseUrl}/api/maintenance/invalid-id`;
  assert.equal((await fetch(url)).status, 401);

  const clientToken = jwt.sign({ id: "c", role: "cliente" }, process.env.JWT_SECRET!);
  const forbidden = await fetch(url, { headers: { authorization: `Bearer ${clientToken}` } });
  assert.equal(forbidden.status, 403);

  const techToken = jwt.sign({ id: "t", role: "tecnico" }, process.env.JWT_SECRET!);
  const response = await fetch(url, { headers: { authorization: `Bearer ${techToken}` } });
  assert.equal(response.status, 400);
});
