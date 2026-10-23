import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import { MongoServerError, ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { User, UserRole } from "./user.model";
import { UserDocument, UserRepositoryMongo } from "./user.repository.mongo";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestBody(req: Request): Record<string, unknown> {
  const body: unknown = req.body;
  return isRecord(body) ? body : {};
}

function publicUser(user: UserDocument): Omit<User, "password"> & { _id: string } {
  const {
    _id,
    password: _password,
    ...fields
  } = user;
  return {
    ...fields,
    _id: _id.toString(),
    id: _id.toString(),
    nombre: user.nombre || user.name,
    bloqueado: user.bloqueado ?? false,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function duplicateKey(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

function sendError(
  res: Response,
  status: number,
  mensaje: string,
  details: Record<string, unknown> = {}
): void {
  res.status(status).json({ ok: false, mensaje, message: mensaje, ...details });
}

export class UserController {
  constructor(private readonly users: UserRepositoryMongo) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = requestBody(req);
    const nameValue = body.name ?? body.nombre;
    const name = typeof nameValue === "string" ? nameValue.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const dni = typeof body.dni === "string" ? body.dni.trim() : "";

    if (!name || !email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
      sendError(
        res,
        400,
        "Nombre, email válido y contraseña de al menos 6 caracteres son obligatorios"
      );
      return;
    }

    try {
      if ((await this.users.findByEmail(email)) || (dni && (await this.users.findByDni(dni)))) {
        sendError(res, 409, "Ya existe un usuario registrado con ese email o DNI");
        return;
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await this.users.create({
        name,
        lastName,
        email,
        password: hashedPassword,
        role: "cliente",
        ...(dni ? { dni } : {}),
        nombre: name,
        bloqueado: false,
      });
      const safeUser = publicUser(user);
      res.status(201).json(
        req.baseUrl.endsWith("/usuario")
          ? safeUser
          : {
              ok: true,
              mensaje: "Usuario creado correctamente",
              user: safeUser,
            }
      );
    } catch (error: unknown) {
      if (duplicateKey(error)) {
        sendError(res, 409, "Email o DNI ya registrado");
        return;
      }
      sendError(res, 500, "Error al crear el usuario", { error: errorMessage(error) });
    }
  };

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.users.findAll();
      res.status(200).json({
        ok: true,
        total: users.length,
        users: users.map(publicUser),
      });
    } catch (error: unknown) {
      sendError(res, 500, "Error al obtener los usuarios", { error: errorMessage(error) });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      sendError(res, 400, "ID de usuario no válido");
      return;
    }
    try {
      const user = await this.users.findById(id);
      if (!user) {
        sendError(res, 404, "Usuario no encontrado");
        return;
      }
      res.status(200).json({ ok: true, user: publicUser(user) });
    } catch (error: unknown) {
      sendError(res, 500, "Error al obtener el usuario", { error: errorMessage(error) });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      sendError(res, 400, "ID de usuario no válido");
      return;
    }
    const body = requestBody(req);
    const updates: Partial<User> = {};
    const nameValue = body.name ?? body.nombre;
    if (nameValue !== undefined) {
      if (typeof nameValue !== "string" || !nameValue.trim()) {
        sendError(res, 400, "El nombre no es válido");
        return;
      }
      updates.name = nameValue.trim();
      updates.nombre = nameValue.trim();
    }
    if (body.lastName !== undefined) {
      if (typeof body.lastName !== "string") {
        sendError(res, 400, "El apellido no es válido");
        return;
      }
      updates.lastName = body.lastName.trim();
    }
    if (body.email !== undefined) {
      if (typeof body.email !== "string" || !/^\S+@\S+\.\S+$/.test(body.email.trim())) {
        sendError(res, 400, "El email no es válido");
        return;
      }
      updates.email = body.email.trim().toLowerCase();
    }
    if (body.dni !== undefined) {
      if (typeof body.dni !== "string" || !body.dni.trim()) {
        sendError(res, 400, "El DNI no es válido");
        return;
      }
      updates.dni = body.dni.trim();
    }
    if (body.password !== undefined) {
      if (typeof body.password !== "string" || body.password.length < 6) {
        sendError(res, 400, "La contraseña debe tener al menos 6 caracteres");
        return;
      }
    }
    if (Object.keys(updates).length === 0 && body.password === undefined) {
      sendError(res, 400, "Debe enviar campos para actualizar");
      return;
    }

    try {
      if (typeof body.password === "string") {
        updates.password = await bcrypt.hash(body.password, 10);
      }
      if (updates.email) {
        const existingEmail = await this.users.findByEmail(updates.email);
        if (existingEmail && existingEmail._id.toString() !== id) {
          sendError(res, 409, "Email ya registrado");
          return;
        }
      }
      if (updates.dni) {
        const existingDni = await this.users.findByDni(updates.dni);
        if (existingDni && existingDni._id.toString() !== id) {
          sendError(res, 409, "DNI ya registrado");
          return;
        }
      }
      const user = await this.users.update(id, updates);
      if (!user) {
        sendError(res, 404, "Usuario no encontrado");
        return;
      }
      res.status(200).json({
        ok: true,
        mensaje: "Usuario actualizado correctamente",
        user: publicUser(user),
      });
    } catch (error: unknown) {
      if (duplicateKey(error)) {
        sendError(res, 409, "Email o DNI ya registrado");
        return;
      }
      sendError(res, 500, "Error al actualizar el usuario", { error: errorMessage(error) });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id;
    if (typeof id !== "string" || !ObjectId.isValid(id)) {
      sendError(res, 400, "ID de usuario no válido");
      return;
    }
    try {
      const deleted = await this.users.delete(id);
      if (!deleted) {
        sendError(res, 404, "Usuario no encontrado");
        return;
      }
      res.status(200).json({ ok: true, mensaje: "Usuario eliminado correctamente" });
    } catch (error: unknown) {
      sendError(res, 500, "Error al eliminar el usuario", { error: errorMessage(error) });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const body = requestBody(req);
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      sendError(res, 400, "La contraseña es obligatoria");
      return;
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const dni = typeof body.dni === "string" ? body.dni.trim() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!email && !dni && !name) {
      sendError(res, 400, "Debes proporcionar email, DNI o nombre junto con la contraseña");
      return;
    }

    try {
      const user = email
        ? await this.users.findByEmail(email)
        : dni
          ? await this.users.findByDni(dni)
          : await this.users.findByName(name);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        sendError(res, 401, "Credenciales incorrectas");
        return;
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        sendError(res, 500, "JWT_SECRET no está configurado");
        return;
      }
      const role: UserRole = user.role === "admin" ? "admin" : "cliente";
      const token = jwt.sign(
        {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role,
          dni: user.dni,
        },
        secret,
        { expiresIn: "2h" }
      );
      const safeUser = publicUser(user);
      res.status(200).json(
        req.baseUrl.endsWith("/usuario")
          ? { ...safeUser, token }
          : {
              ok: true,
              mensaje: "Inicio de sesión exitoso",
              token,
              user: safeUser,
            }
      );
    } catch (error: unknown) {
      sendError(res, 500, "Error al iniciar sesión", { error: errorMessage(error) });
    }
  };
}
