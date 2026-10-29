import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AddressInfo } from "node:net";
import { Server } from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import { Db, ObjectId } from "mongodb";
import { crearPuntosMantenimientoRoutes } from "../src/mantenimiento/puntos-mantenimiento.routes";

process.env.JWT_SECRET = "test-only-secret";

const servers: Server[] = [];

function createFakeDb() {
  const stores: Record<string, Record<string, any>[]> = {};
  return {
    collection(name: string) {
      const docs = (stores[name] ??= []);
      return {
        countDocuments: async () => docs.length,
        insertMany: async (items: Record<string, any>[]) => {
          items.forEach((item) => docs.push({ ...item, _id: new ObjectId() }));
        },
        insertOne: async (item: Record<string, any>) => {
          const _id = new ObjectId();
          docs.push({ ...item, _id });
          return { insertedId: _id };
        },
        find: () => ({ toArray: async () => docs }),
        bulkWrite: async (ops: any[]) => {
          let matchedCount = 0;
          for (const { updateOne } of ops) {
            const doc = docs.find((d) => d._id.equals(updateOne.filter._id));
            if (doc) {
              Object.assign(doc, updateOne.update.$set);
              matchedCount++;
            }
          }
          return { matchedCount };
        },
        deleteOne: async (filter: { _id: ObjectId }) => {
          const index = docs.findIndex((d) => d._id.equals(filter._id));
          if (index >= 0) docs.splice(index, 1);
          return { deletedCount: index >= 0 ? 1 : 0 };
        },
      };
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use("/api", crearPuntosMantenimientoRoutes(createFakeDb() as unknown as Db));
  const server = app.listen(0);
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/mantenimiento/puntos`;
}

const token = (role: string) =>
  jwt.sign({ id: "u1", nombre: "Test", role }, process.env.JWT_SECRET!);
const headers = (role: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token(role)}`,
});

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

test("puntos de mantenimiento: listar, mover, crear y eliminar", async () => {
  const url = await startServer();

  assert.equal((await fetch(url)).status, 401);
  assert.equal((await fetch(url, { headers: headers("cliente") })).status, 403);

  const listed = await fetch(url, { headers: headers("tecnico") });
  assert.equal(listed.status, 200);
  const puntos = await listed.json();
  assert.equal(puntos.length, 6);
  assert.ok(Array.isArray(puntos[0].tareas));

  const moved = await fetch(url, {
    method: "PUT",
    headers: headers("tecnico"),
    body: JSON.stringify({ puntos: [{ id: puntos[0].id, x: 10.5, y: 90 }] }),
  });
  assert.equal(moved.status, 200);
  const after = await (await fetch(url, { headers: headers("tecnico") })).json();
  assert.equal(after[0].x, 10.5);
  assert.equal(after[0].y, 90);

  const invalid = await fetch(url, {
    method: "PUT",
    headers: headers("tecnico"),
    body: JSON.stringify({ id: puntos[0].id, x: 101, y: 5 }),
  });
  assert.equal(invalid.status, 400);

  const forbidden = await fetch(url, {
    method: "POST",
    headers: headers("cliente"),
    body: JSON.stringify({ zona: "frenos", nombre: "Freno extra", x: 1, y: 2 }),
  });
  assert.equal(forbidden.status, 403);

  const created = await fetch(url, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ zona: "frenos", nombre: "Freno extra", x: 1, y: 2 }),
  });
  assert.equal(created.status, 201);
  const { id } = await created.json();

  const badZone = await fetch(url, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ zona: "nada", nombre: "X", x: 1, y: 2 }),
  });
  assert.equal(badZone.status, 400);

  assert.equal((await fetch(`${url}/${id}`, { method: "DELETE", headers: headers("admin") })).status, 204);
  assert.equal((await fetch(`${url}/${id}`, { method: "DELETE", headers: headers("admin") })).status, 404);
  assert.equal((await fetch(`${url}/abc`, { method: "DELETE", headers: headers("admin") })).status, 400);
});
