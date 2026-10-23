import { Router } from "express";
import { Db } from "mongodb";
import { authenticate, requireAdmin } from "../auth/auth.middleware";
import { UserController } from "./user.controller";
import { UserRepositoryMongo } from "./user.repository.mongo";

export function createUserRoutes(db: Db): Router {
  const router = Router();
  const controller = new UserController(new UserRepositoryMongo(db));

  router.post("/login", controller.login);
  router.post("/registro", controller.create);
  router.post("/", controller.create);
  router.get("/", authenticate, controller.getAll);
  router.get("/:id", authenticate, requireAdmin, controller.getById);
  router.put("/:id", authenticate, requireAdmin, controller.update);
  router.delete("/:id", authenticate, requireAdmin, controller.delete);

  return router;
}
