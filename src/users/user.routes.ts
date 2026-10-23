import { Router } from "express";
import { Db } from "mongodb";

export function createUserRoutes(_db: Db): Router {
  return Router();
}
