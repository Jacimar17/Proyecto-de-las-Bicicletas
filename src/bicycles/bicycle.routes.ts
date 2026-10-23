import { Router } from "express";
import { Db } from "mongodb";

export function createBicycleRoutes(_db: Db): Router {
  return Router();
}
