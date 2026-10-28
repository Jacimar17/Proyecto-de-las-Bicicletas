import { Router } from "express";
import { Db } from "mongodb";
import { authenticate } from "../auth/auth.middleware";
import { TripController } from "./trip.controller";

export function createTripRoutes(db: Db): Router {
  const router = Router();
  const controller = new TripController(db);

  router.get("/mis-viajes", authenticate, controller.history);
  router.post("/", authenticate, controller.start);
  router.patch("/:id/devolver", authenticate, controller.finish);

  return router;
}
