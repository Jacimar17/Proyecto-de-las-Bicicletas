import { Router } from "express";
import { Db } from "mongodb";
import { authenticate, requireAdmin } from "../auth/auth.middleware";
import { MaintenanceController } from "./maintenance.controller";

export function createMaintenanceRoutes(db: Db): Router {
  const router = Router();
  const controller = new MaintenanceController(db);

  router.get("/:id", controller.getById);
  router.patch("/:id/suitable", authenticate, requireAdmin, controller.markSuitable);
  router.patch("/:id/not-suitable", authenticate, requireAdmin, controller.markNotSuitable);

  return router;
}
