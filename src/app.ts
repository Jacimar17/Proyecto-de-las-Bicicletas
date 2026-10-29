import cors from 'cors';
import express, { Express } from 'express';
import { Db } from 'mongodb';
import { BicycleController } from './bicycles/bicycle.controller';
import { BicycleRepositoryMongo } from './bicycles/bicycle.repository.mongo';
import { BicycleRoutes } from './bicycles/bicycle.routes';
import { BicycleService } from './bicycles/bicycle.service';
import { MaintenanceController } from './maintenance/maintenance.controller';
import { MaintenanceRepositoryMongo } from './maintenance/maintenance.repository.mongo';
import { MaintenanceRoutes } from './maintenance/maintenance.routes';
import { MaintenanceService } from './maintenance/maintenance.service';
import { createMaintenanceTaskRoutes } from './maintenance/maintenance-task.routes';
import { StationController } from './stations/station.controller';
import { StationRepositoryMongo } from './stations/station.repository.mongo';
import { StationRoutes } from './stations/station.routes';
import { StationService } from './stations/station.service';
import { createSyncRoutes } from './sync/sync.routes';
import { SyncService } from './sync/sync.service';
import { TripController } from './trips/trip.controller';
import { TripRepositoryMongo } from './trips/trip.repository.mongo';
import { TripRoutes } from './trips/trip.routes';
import { TripService } from './trips/trip.service';
import { UnlockCodeRepositoryMongo } from './trips/unlock-code.repository.mongo';
import { UserController } from './users/user.controller';
import { UserRepositoryMongo } from './users/user.repository.mongo';
import { UserRoutes } from './users/user.routes';
import { UserService } from './users/user.service';

export function createApp(db: Db, sync?: SyncService): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const bicycleRepository = new BicycleRepositoryMongo(db);
  const stationRepository = new StationRepositoryMongo(db);
  const userRepository = new UserRepositoryMongo(db);

  const bicycleRoutes = new BicycleRoutes(
    new BicycleController(new BicycleService(bicycleRepository, stationRepository))
  );
  const stationRoutes = new StationRoutes(
    new StationController(new StationService(stationRepository, bicycleRepository))
  );
  const userRoutes = new UserRoutes(new UserController(new UserService(userRepository)));
  const tripRoutes = new TripRoutes(
    new TripController(
      new TripService(
        new TripRepositoryMongo(db),
        bicycleRepository,
        stationRepository,
        userRepository,
        new UnlockCodeRepositoryMongo(db)
      )
    )
  );
  const maintenanceRoutes = new MaintenanceRoutes(
    new MaintenanceController(
      new MaintenanceService(new MaintenanceRepositoryMongo(db), bicycleRepository)
    )
  );

  app.get('/', (_req, res) => {
    res.json({
      message: 'API del Sistema de bicicletas compartidas de Venado Tuerto',
      version: '1.0.0',
      endpoints: {
        bicycles: '/api/bicycles (/api/bicicletas)',
        stations: '/api/stations (/api/estaciones)',
        users: '/api/users (/api/usuarios)',
        maintenance: '/api/maintenance (/api/mantenimientos)',
        maintenanceTasks: '/api/maintenance-tasks (/api/tareas-mantenimiento)',
        trips: '/api/trips (/api/viajes)'
      }
    });
  });

  // Cada dominio tiene una única implementación, publicada con prefijos en inglés y en español.
  app.use(['/api/bicycles', '/api/bicicletas', '/api/bicicleta'], bicycleRoutes.router);
  app.use(['/api/stations', '/api/estaciones', '/api/estacion'], stationRoutes.router);
  app.use(['/api/users', '/api/usuarios', '/api/usuario'], userRoutes.router);
  app.use(['/api/trips', '/api/viajes'], tripRoutes.router);
  app.use(['/api/maintenance', '/api/mantenimientos', '/api/mantenimiento'], maintenanceRoutes.router);
  app.use(['/api/maintenance-tasks', '/api/tareas-mantenimiento'], createMaintenanceTaskRoutes(db));
  if (sync) app.use('/api/sync', createSyncRoutes(sync));

  return app;
}

export async function ensureApplicationIndexes(db: Db): Promise<void> {
  await Promise.all([
    new UserRepositoryMongo(db).ensureIndexes(),
    new TripRepositoryMongo(db).ensureIndexes(),
    new UnlockCodeRepositoryMongo(db).ensureIndexes()
  ]);
}
