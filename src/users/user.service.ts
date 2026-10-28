import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { MongoServerError } from "mongodb";
import { ApiError } from "../common/api-error";
import { PublicUser, User, UserRole } from "./user.entity";
import { UserRepository } from "./user.repository.interface";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function duplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async create(data: unknown): Promise<PublicUser> {
    const body = isRecord(data) ? data : {};
    const nameValue = body.name ?? body.nombre;
    const name = typeof nameValue === "string" ? nameValue.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const dni = typeof body.dni === "string" ? body.dni.trim() : "";

    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
      throw new ApiError(
        "Nombre, email válido y contraseña de al menos 6 caracteres son obligatorios",
        400
      );
    }

    try {
      if ((await this.users.findByEmail(email)) || (dni && (await this.users.findByDni(dni)))) {
        throw new ApiError("Ya existe un usuario registrado con ese email o DNI", 409);
      }

      const user = await this.users.create({
        name,
        lastName,
        email,
        password: await bcrypt.hash(password, 10),
        role: "cliente",
        ...(dni ? { dni } : {}),
        nombre: name,
        puntuacion: 10,
        suspendidoHasta: null,
        bloqueado: false,
      });
      return this.publicUser(user);
    } catch (error: unknown) {
      if (duplicateKey(error)) throw new ApiError("Email o DNI ya registrado", 409);
      throw error;
    }
  }

  async getAll(): Promise<PublicUser[]> {
    return (await this.users.findAll()).map((user) => this.publicUser(user));
  }

  async getById(id: string): Promise<PublicUser> {
    this.validateId(id);
    const user = await this.users.findById(id);
    if (!user) throw new ApiError("Usuario no encontrado", 404);
    return this.publicUser(user);
  }

  async update(id: string, data: unknown): Promise<PublicUser> {
    this.validateId(id);
    const body = isRecord(data) ? data : {};
    const updates: Partial<Omit<User, "id">> = {};
    const nameValue = body.name ?? body.nombre;

    if (nameValue !== undefined) {
      if (typeof nameValue !== "string" || !nameValue.trim()) {
        throw new ApiError("El nombre no es válido", 400);
      }
      updates.name = nameValue.trim();
      updates.nombre = nameValue.trim();
    }
    if (body.lastName !== undefined) {
      if (typeof body.lastName !== "string") throw new ApiError("El apellido no es válido", 400);
      updates.lastName = body.lastName.trim();
    }
    if (body.email !== undefined) {
      if (typeof body.email !== "string" || !/^\S+@\S+\.\S+$/.test(body.email.trim())) {
        throw new ApiError("El email no es válido", 400);
      }
      updates.email = body.email.trim().toLowerCase();
    }
    if (body.dni !== undefined) {
      if (typeof body.dni !== "string" || !body.dni.trim()) {
        throw new ApiError("El DNI no es válido", 400);
      }
      updates.dni = body.dni.trim();
    }
    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < 6) {
        throw new ApiError("La contraseña debe tener al menos 6 caracteres", 400);
      }
    }
    if (Object.keys(updates).length === 0 && body.password === undefined) {
      throw new ApiError("Debe enviar campos para actualizar", 400);
    }

    try {
      if (typeof body.password === "string") {
        updates.password = await bcrypt.hash(body.password, 10);
      }
      if (updates.email) {
        const existingEmail = await this.users.findByEmail(updates.email);
        if (existingEmail && existingEmail.id !== id) {
          throw new ApiError("Email ya registrado", 409);
        }
      }
      if (updates.dni) {
        const existingDni = await this.users.findByDni(updates.dni);
        if (existingDni && existingDni.id !== id) throw new ApiError("DNI ya registrado", 409);
      }
      const user = await this.users.update(id, updates);
      if (!user) throw new ApiError("Usuario no encontrado", 404);
      return this.publicUser(user);
    } catch (error: unknown) {
      if (duplicateKey(error)) throw new ApiError("Email o DNI ya registrado", 409);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    this.validateId(id);
    if (!(await this.users.delete(id))) throw new ApiError("Usuario no encontrado", 404);
  }

  async login(data: unknown): Promise<{ user: PublicUser; token: string }> {
    const body = isRecord(data) ? data : {};
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) throw new ApiError("La contraseña es obligatoria", 400);

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const dni = typeof body.dni === "string" ? body.dni.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!email && !dni && !name) {
      throw new ApiError("Debes proporcionar email, DNI o nombre junto con la contraseña", 400);
    }

    const user = email
      ? await this.users.findByEmail(email)
      : dni
        ? await this.users.findByDni(dni)
        : await this.users.findByName(name);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError("Credenciales incorrectas", 401);
    }
    if (user.bloqueado) {
      throw new ApiError("Tu cuenta está bloqueada y no puede utilizarse", 403);
    }
    if (user.suspendidoHasta && user.suspendidoHasta.getTime() > Date.now()) {
      throw new ApiError("Tu cuenta está suspendida", 403);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET no está configurado");
    const role: UserRole =
      user.role === "admin" || user.role === "tecnico" ? user.role : "cliente";
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        nombre: user.nombre || user.name,
        email: user.email,
        role,
        dni: user.dni,
        accountCollection: "users",
      },
      secret,
      { expiresIn: "2h" }
    );
    return { user: this.publicUser(user), token };
  }

  private publicUser(user: User): PublicUser {
    if (!user.id) throw new Error("El usuario no tiene un identificador");
    const { password: _password, ...fields } = user;
    return {
      ...fields,
      _id: user.id,
      id: user.id,
      nombre: user.nombre || user.name,
      puntuacion: user.puntuacion ?? 10,
      suspendidoHasta: user.suspendidoHasta ?? null,
      bloqueado: user.bloqueado ?? false,
    };
  }

  private validateId(id: string): void {
    if (!/^[\da-f]{24}$/i.test(id)) throw new ApiError("ID de usuario no válido", 400);
  }
}
