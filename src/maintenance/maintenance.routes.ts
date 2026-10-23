import { Router } from "express";
import { Db } from "mongodb";

export function createMaintenanceRoutes(_db: Db): Router {
  return Router();
}
