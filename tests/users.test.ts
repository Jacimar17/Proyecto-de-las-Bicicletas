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
  const users: Record<string, unknown>[] = [];
  return {
    collection() {
      return {
        find: () => ({
          sort: () => ({ toArray: async () => [...users] }),
        }),
        findOne: async (filter: Record<string, unknown>) =>
          users.find((user) =>
            Object.entries(filter).every(([key, value]) =>
              key === "_id" && value instanceof ObjectId
                ? (user[key] as ObjectId | undefined)?.equals(value)
                : user[key] === value
            )
          ) ?? null,
        insertOne: async (document: Record<string, unknown>) => {
          users.push(document);
          return { acknowledged: true, insertedId: document._id };
        },
        findOneAndUpdate: async (
          filter: Record<string, unknown>,
          update: { $set: Record<string, unknown> }
        ) => {
          const user = users.find((entry) =>
            (entry._id as ObjectId | undefined)?.equals(filter._id as ObjectId)
          );
          if (!user) return null;
          Object.assign(user, update.$set);
          return user;
        },
        deleteOne: async (filter: Record<string, unknown>) => {
          const index = users.findIndex((user) =>
            (user._id as ObjectId | undefined)?.equals(filter._id as ObjectId)
          );
          if (index < 0) return { deletedCount: 0 };
          users.splice(index, 1);
          return { deletedCount: 1 };
        },
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

test("user registration hashes passwords and login returns a signed token", async () => {
  const baseUrl = await startServer();
  const registration = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Ada",
      lastName: "Lovelace",
      email: "ADA@example.com",
      password: "secret123",
      role: "admin",
    }),
  });
  const registrationData = await registration.json();
  assert.equal(registration.status, 201);
  assert.equal(registrationData.user.email, "ada@example.com");
  assert.equal(registrationData.user.role, "cliente");
  assert.equal("password" in registrationData.user, false);

  const failedLogin = await fetch(`${baseUrl}/api/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ada@example.com", password: "wrong-password" }),
  });
  assert.equal(failedLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "ada@example.com", password: "secret123" }),
  });
  const loginData = await login.json();
  assert.equal(login.status, 200);
  assert.equal(typeof loginData.token, "string");
  const decoded = jwt.verify(loginData.token, process.env.JWT_SECRET!);
  if (typeof decoded === "string") throw new Error("JWT payload was not an object");
  assert.equal(decoded.role, "cliente");
});

test("Spanish user registration and DNI login aliases remain available", async () => {
  const baseUrl = await startServer();
  const registration = await fetch(`${baseUrl}/api/usuario/registro`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nombre: "Grace",
      dni: "12345678",
      email: "grace@example.com",
      password: "secret123",
    }),
  });
  const user = await registration.json();
  assert.equal(registration.status, 201);
  assert.equal(user.nombre, "Grace");
  assert.equal(user.dni, "12345678");

  const login = await fetch(`${baseUrl}/api/usuario/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dni: "12345678", password: "secret123" }),
  });
  const loggedInUser = await login.json();
  assert.equal(login.status, 200);
  assert.equal(loggedInUser.nombre, "Grace");
  assert.equal(typeof loggedInUser.token, "string");
});

test("user listing requires authentication and only admins can update accounts", async () => {
  const baseUrl = await startServer();
  const registration = await fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Lin",
      email: "lin@example.com",
      password: "secret123",
    }),
  });
  const { user } = await registration.json();

  const unauthorized = await fetch(`${baseUrl}/api/users`);
  assert.equal(unauthorized.status, 401);

  const clientToken = jwt.sign({ id: user.id, role: "cliente" }, process.env.JWT_SECRET!);
  const listing = await fetch(`${baseUrl}/api/users`, {
    headers: { authorization: `Bearer ${clientToken}` },
  });
  assert.equal(listing.status, 200);

  const forbidden = await fetch(`${baseUrl}/api/users/${user.id}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${clientToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: "Changed" }),
  });
  assert.equal(forbidden.status, 403);

  const adminToken = jwt.sign({ id: "admin-id", role: "admin" }, process.env.JWT_SECRET!);
  const updated = await fetch(`${baseUrl}/api/users/${user.id}`, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${adminToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ name: "Lin Updated" }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).user.name, "Lin Updated");
});
