import assert from "node:assert/strict";
import { test } from "node:test";
import { User } from "../src/users/user.entity";
import { UserRepository } from "../src/users/user.repository.interface";
import { GoogleProfile, UserService } from "../src/users/user.service";

process.env.JWT_SECRET = "test-only-secret";

function makeRepository(initial: User[] = []): UserRepository & { items: User[] } {
  const items = [...initial];
  return {
    items,
    findAll: async () => items,
    findById: async (id) => items.find((u) => u.id === id) ?? null,
    findByEmail: async (email) => items.find((u) => u.email === email) ?? null,
    findByGoogleId: async (googleId) => items.find((u) => u.googleId === googleId) ?? null,
    findByDni: async () => null,
    findByName: async () => null,
    create: async (data) => {
      const user = { ...data, id: `u${items.length + 1}` };
      items.push(user);
      return user;
    },
    update: async (id, data) => {
      const user = items.find((u) => u.id === id);
      return user ? Object.assign(user, data) : null;
    },
    delete: async () => false,
  };
}

const profile: GoogleProfile = {
  googleId: "g-1",
  email: "Ana@Example.com",
  emailVerified: true,
  name: "Ana",
  familyName: "Pérez",
};

test("login con Google crea un usuario cliente nuevo", async () => {
  const repo = makeRepository();
  const service = new UserService(repo, async () => profile);
  const result = await service.loginGoogle({ credential: "token" });
  assert.equal(result.user.email, "ana@example.com");
  assert.equal(result.user.role, "cliente");
  assert.ok(result.token);
  assert.equal(repo.items.length, 1);
});

test("login con Google vincula una cuenta existente por email", async () => {
  const repo = makeRepository([
    { id: "u0", name: "Ana", lastName: "", email: "ana@example.com", password: "x", role: "admin", puntuacion: 10 },
  ]);
  const service = new UserService(repo, async () => profile);
  const result = await service.loginGoogle({ credential: "token" });
  assert.equal(result.user.id, "u0");
  assert.equal(repo.items[0].googleId, "g-1");
  assert.equal(repo.items.length, 1);
});

test("login con Google rechaza credenciales inválidas, sin email verificado o bloqueadas", async () => {
  const invalid = new UserService(makeRepository(), async () => {
    throw new Error("bad token");
  });
  await assert.rejects(invalid.loginGoogle({ credential: "x" }), { status: 401 });
  await assert.rejects(invalid.loginGoogle({}), { status: 400 });

  const unverified = new UserService(makeRepository(), async () => ({ ...profile, emailVerified: false }));
  await assert.rejects(unverified.loginGoogle({ credential: "x" }), { status: 401 });

  const blocked = new UserService(
    makeRepository([
      { id: "u0", name: "Ana", lastName: "", email: "ana@example.com", googleId: "g-1", role: "cliente", puntuacion: 10, bloqueado: true },
    ]),
    async () => profile
  );
  await assert.rejects(blocked.loginGoogle({ credential: "x" }), { status: 403 });
});
