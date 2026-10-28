import { Router } from "express";
import { Db } from "mongodb";
import { authenticate, requireRole } from "../auth/auth.middleware";
import { MaintenanceController } from "./maintenance.controller";

export function createMaintenanceRoutes(db: Db): Router {
  const router = Router();
  const controller = new MaintenanceController(db);

  const staff = requireRole("admin", "tecnico");
  router.get("/:id", authenticate, staff, controller.getById);
  router.patch("/:id/suitable", authenticate, staff, controller.markSuitable);
  router.patch("/:id/not-suitable", authenticate, staff, controller.markNotSuitable);

  return router;
}
