import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AddressInfo } from "node:net";
import { Server } from "node:http";
import { Db, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app";

process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-only-secret";
const servers: Server[] = [];

type Doc = Record<string, unknown>;

function matches(document: Doc, filter: Doc): boolean {
  return Object.entries(filter).every(([key, value]) =>
    value instanceof ObjectId
      ? (document[key] as ObjectId | undefined)?.equals(value)
      : document[key] === value
  );
}

function createFakeDb(): Db {
  const collections = new Map<string, Doc[]>();
  const fake = {
    collection(name: string) {
      const documents = collections.get(name) ?? [];
      collections.set(name, documents);
      return {
        createIndex: async () => "index",
        find: (filter: Doc = {}) => ({
          sort: () => ({ toArray: async () => documents.filter((d) => matches(d, filter)) }),
          toArray: async () => documents.filter((d) => matches(d, filter)),
        }),
        findOne: async (filter: Doc) => documents.find((d) => matches(d, filter)) ?? null,
        insertOne: async (document: Doc) => {
          const _id = new ObjectId();
          documents.push({ ...document, _id });
          return { acknowledged: true, insertedId: _id };
        },
        findOneAndUpdate: async (filter: Doc, update: { $set: Doc }) => {
          const document = documents.find((d) => matches(d, filter));
          if (!document) return null;
          Object.assign(document, update.$set);
          return document;
        },
        deleteOne: async (filter: Doc) => {
          const index = documents.findIndex((d) => matches(d, filter));
          if (index < 0) return { deletedCount: 0 };
          documents.splice(index, 1);
          return { deletedCount: 1 };
        },
      };
    },
  };
  return fake as unknown as Db;
}

async function startServer() {
  const server = createApp(createFakeDb()).listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function headers(role?: string) {
  const result: Record<string, string> = { "content-type": "application/json" };
  if (role) {
    const token = jwt.sign({ id: `${role}-id`, nombre: role, email: `${role}@x.com`, role }, process.env.JWT_SECRET!);
    result.authorization = `Bearer ${token}`;
  }
  return result;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((s) => new Promise((resolve) => s.close(resolve))));
});

test("la raíz identifica al Sistema de bicicletas compartidas de Venado Tuerto", async () => {
  const base = await startServer();
  const body = (await (await fetch(`${base}/`)).json()) as { message: string };
  assert.match(body.message, /Venado Tuerto/);
});

test("bicicletas: mismo router en rutas en inglés y en español", async () => {
  const base = await startServer();
  const station = await fetch(`${base}/api/stations`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ nombre: "Centro", barrio: "Centro", direccion: "Belgrano 1", lat: -33.74, lng: -61.97, capacidad: 10, activa: true }),
  });
  assert.equal(station.status, 201);
  const { id: stationId } = (await station.json()) as { id: string };

  const created = await fetch(`${base}/api/bicicletas`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({
      codigo: "BIC-1", modelo: "Urbana", ubicacion: "Centro",
      estado: "DISPONIBLE", estacion_id: stationId,
    }),
  });
  assert.equal(created.status, 201, JSON.stringify(await created.clone().json()));

  for (const prefix of ["bicycles", "bicicletas", "bicicleta"]) {
    const list = (await (await fetch(`${base}/api/${prefix}`)).json()) as { codigo: string }[];
    assert.equal(list.length, 1, prefix);
    assert.equal(list[0].codigo, "BIC-1");
  }

  const duplicate = await fetch(`${base}/api/bicycles`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ codigo: "BIC-1", modelo: "X", ubicacion: "Centro", estado: "DISPONIBLE", estacion_id: stationId }),
  });
  assert.equal(duplicate.status, 409);

  const denied = await fetch(`${base}/api/bicycles`, {
    method: "POST",
    headers: headers("cliente"),
    body: "{}",
  });
  assert.equal(denied.status, 403);
});

test("usuarios: registro, login y perfil por rutas en inglés y español", async () => {
  const base = await startServer();
  const register = await fetch(`${base}/api/usuarios/registro`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ nombre: "Ana", apellido: "Pérez", email: "ana@example.com", password: "secreto1" }),
  });
  assert.equal(register.status, 201);

  const login = await fetch(`${base}/api/users/login`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email: "ana@example.com", password: "secreto1" }),
  });
  assert.equal(login.status, 200);
  const session = (await login.json()) as { token: string; role: string; user: { nombre: string } };
  assert.equal(session.role, "cliente");
  assert.equal(session.user.nombre, "Ana");

  for (const path of ["/api/users/profile", "/api/usuario/perfil"]) {
    const profile = await fetch(`${base}${path}`, { headers: { authorization: `Bearer ${session.token}` } });
    assert.equal(profile.status, 200, path);
  }

  const wrong = await fetch(`${base}/api/users/login`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ email: "ana@example.com", password: "incorrecta" }),
  });
  assert.equal(wrong.status, 401);
  assert.equal(((await wrong.json()) as { message: string }).message, "Credenciales incorrectas");
});

test("usuarios: el listado es solo para administradores", async () => {
  const base = await startServer();
  assert.equal((await fetch(`${base}/api/users`)).status, 401);
  assert.equal((await fetch(`${base}/api/users`, { headers: headers("cliente") })).status, 403);
  assert.equal((await fetch(`${base}/api/usuarios`, { headers: headers("admin") })).status, 200);
});

test("mantenimiento: un técnico registra y lista por ambas rutas", async () => {
  const base = await startServer();
  const station = await (await fetch(`${base}/api/stations`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ nombre: "Norte", barrio: "Norte", direccion: "Mitre 2", lat: -33.74, lng: -61.97, capacidad: 10, activa: true }),
  })).json() as { id: string };
  const bicycle = await (await fetch(`${base}/api/bicycles`, {
    method: "POST",
    headers: headers("admin"),
    body: JSON.stringify({ codigo: "BIC-9", modelo: "Ruta", ubicacion: "Norte", estado: "DISPONIBLE", estacion_id: station.id }),
  })).json() as { id: string };

  const created = await fetch(`${base}/api/maintenance`, {
    method: "POST",
    headers: headers("tecnico"),
    body: JSON.stringify({ bicicleta_id: bicycle.id, estado: "EN_MANTENIMIENTO" }),
  });
  assert.equal(created.status, 201);

  for (const prefix of ["maintenance", "mantenimientos", "mantenimiento"]) {
    const list = (await (await fetch(`${base}/api/${prefix}`, { headers: headers("tecnico") })).json()) as unknown[];
    assert.equal(list.length, 1, prefix);
  }
});
