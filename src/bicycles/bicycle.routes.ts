import { Router } from "express";
import { Db } from "mongodb";
import { authenticate, requireRole } from "../auth/auth.middleware";
import { BicycleController } from "./bicycle.controller";

export function createBicycleRoutes(db: Db): Router {
  const router = Router();
  const controller = new BicycleController(db);

  router.get("/bicycles", controller.getAll);
  router.get("/bicycles/:id", controller.getById);
  router.post("/bicycles", authenticate, requireRole("admin"), controller.create);
  router.put("/bicycles/:id", authenticate, requireRole("admin"), controller.update);
  router.delete("/bicycles/:id", authenticate, requireRole("admin"), controller.delete);
  router.patch(
    "/bicycles/:id/status",
    authenticate,
    requireRole("admin", "tecnico"),
    controller.updateStatus
  );
  router.patch(
    "/bicycles/:id/request",
    authenticate,
    requireRole("cliente", "admin"),
    controller.request
  );

  return router;
}
