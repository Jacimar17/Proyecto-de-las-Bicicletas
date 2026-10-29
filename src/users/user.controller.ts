import { Request, Response } from "express";
import { ApiError, errorMessage, errorStatus } from "../common/api-error";
import { UserService } from "./user.service";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestBody(req: Request): Record<string, unknown> {
  return isRecord(req.body) ? req.body : {};
}

function requestId(req: Request): string {
  const id = req.params.id;
  if (typeof id !== "string") throw new ApiError("ID de usuario no válido", 400);
  return id;
}

function sendError(res: Response, error: unknown, fallback: string): void {
  const status = errorStatus(error);
  const message = error instanceof ApiError ? error.message : fallback;
  res.status(status).json({
    ok: false,
    mensaje: message,
    message,
    ...(status === 500 ? { error: errorMessage(error) } : {}),
  });
}

export class UserController {
  constructor(private readonly users: UserService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.users.create(requestBody(req));
      res.status(201).json(
        req.baseUrl.endsWith("/usuario")
          ? user
          : { ok: true, mensaje: "Usuario creado correctamente", user }
      );
    } catch (error: unknown) {
      sendError(res, error, "Error al crear el usuario");
    }
  };

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.users.getAll();
      res.status(200).json({ ok: true, total: users.length, users });
    } catch (error: unknown) {
      sendError(res, error, "Error al obtener los usuarios");
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.users.getById(requestId(req));
      res.status(200).json({ ok: true, user });
    } catch (error: unknown) {
      sendError(res, error, "Error al obtener el usuario");
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.users.update(requestId(req), requestBody(req));
      res.status(200).json({
        ok: true,
        mensaje: "Usuario actualizado correctamente",
        user,
      });
    } catch (error: unknown) {
      sendError(res, error, "Error al actualizar el usuario");
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.users.delete(requestId(req));
      res.status(200).json({ ok: true, mensaje: "Usuario eliminado correctamente" });
    } catch (error: unknown) {
      sendError(res, error, "Error al eliminar el usuario");
    }
  };

  loginGoogle = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.users.loginGoogle(requestBody(req));
      res.status(200).json({
        ok: true,
        mensaje: "Inicio de sesión exitoso",
        token: result.token,
        user: result.user,
      });
    } catch (error: unknown) {
      sendError(res, error, "Error al iniciar sesión con Google");
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.users.login(requestBody(req));
      res.status(200).json(
        req.baseUrl.endsWith("/usuario")
          ? { ...result.user, token: result.token }
          : {
              ok: true,
              mensaje: "Inicio de sesión exitoso",
              token: result.token,
              user: result.user,
            }
      );
    } catch (error: unknown) {
      sendError(res, error, "Error al iniciar sesión");
    }
  };
}
