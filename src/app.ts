import cors from "cors";
import express, { Express } from "express";
import { Db } from "mongodb";
import { createBicycleRoutes } from "./bicycles/bicycle.routes";
import { EstacionRoutes } from "./estacion/estacion.routes";
import { EstacionController } from "./estacion/estacion.controller";
import { EstacionRepositoryMongo } from "./estacion/estacion.repository.mongo";
import { EstacionService } from "./estacion/estacion.service";
import { BicicletaRepositoryMongo } from "./bicycles/bicicleta.repository.mongo";
import { createMaintenanceRoutes } from "./maintenance/maintenance.routes";
import { createUserRoutes } from "./users/user.routes";

export function createApp(db: Db): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const bicycleRepository = new BicicletaRepositoryMongo(db);
  const stationRepository = new EstacionRepositoryMongo(db);
  const stationService = new EstacionService(stationRepository, bicycleRepository);
  const stationController = new EstacionController(stationService);
  const stationRoutes = new EstacionRoutes(stationController);

  app.get("/", (_req, res) => {
    res.json({
      message: "Bike rental API is running",
      version: "1.0.0",
      endpoints: {
        api: "/api",
        bicycles: "/api/bicycles",
        maintenance: "/api/maintenance",
        users: "/api/users",
        stations: "/api/estaciones",
      },
    });
  });

  app.use("/api", createBicycleRoutes(db));
  app.use("/api", stationRoutes.router);
  app.use("/api/maintenance", createMaintenanceRoutes(db));
  app.use("/api/users", createUserRoutes(db));
  app.use("/api/usuario", createUserRoutes(db));

  return app;
}
