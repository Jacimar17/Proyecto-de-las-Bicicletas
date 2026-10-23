import { Router } from "express";
import { Db } from "mongodb";
import { BicycleController } from "./bicycle.controller";

export function createBicycleRoutes(db: Db): Router {
  const router = Router();
  const controller = new BicycleController(db);

  router.post("/bicycles", controller.create);
  router.get("/bicycles", controller.getAll);
  router.get("/bicycles/:id", controller.getById);
  router.put("/bicycles/:id", controller.update);
  router.delete("/bicycles/:id", controller.delete);
  router.patch("/bicycles/:id/status", controller.updateStatus);
  router.patch("/bicycles/:id/request", controller.request);

  router.get("/bicicletas", controller.getSpanishAll);
  router.post("/bicicleta", controller.createSpanish);
  router.put("/bicicleta/:id", controller.updateSpanish);
  router.delete("/bicicleta/:id", controller.deleteSpanish);

  return router;
}
