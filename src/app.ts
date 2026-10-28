import cors from 'cors';
import express, { Express } from 'express';
import { Db } from 'mongodb';
import { createBicycleRoutes } from './bicycles/bicycle.routes';
import { BicicletaController } from './bicycles/bicicleta.controller';
import { BicicletaRepositoryMongo } from './bicycles/bicicleta.repository.mongo';
import { BicicletaRoutes } from './bicycles/bicicleta.routes';
import { BicicletaService } from './bicycles/bicicleta.service';
import { EstacionController } from './estacion/estacion.controller';
import { EstacionRepositoryMongo } from './estacion/estacion.repository.mongo';
import { EstacionRoutes } from './estacion/estacion.routes';
import { EstacionService } from './estacion/estacion.service';
import { createMaintenanceRoutes } from './maintenance/maintenance.routes';
import { MantenimientoController } from './mantenimiento/mantenimiento.controller';
import { MantenimientoRepositoryMongo } from './mantenimiento/mantenimiento.repository.mongo';
import { MantenimientoRoutes } from './mantenimiento/mantenimiento.routes';
import { MantenimientoService } from './mantenimiento/mantenimiento.service';
import { UsuarioController } from './usuario/usuario.controller';
import { UsuarioRepositoryMongo } from './usuario/usuario.repository.mongo';
import { UsuarioRoutes } from './usuario/usuario.routes';
import { UsuarioService } from './usuario/usuario.service';
import { ViajeController } from './viaje/viaje.controller';
import { ViajeRepositoryMongo } from './viaje/viaje.repository.mongo';
import { ViajeRoutes } from './viaje/viaje.routes';
import { ViajeService } from './viaje/viaje.service';
import { UserRepositoryMongo } from './users/user.repository.mongo';
import { createUserRoutes } from './users/user.routes';
import { createSyncRoutes } from './sync/sync.routes';
import { SyncService } from './sync/sync.service';

export function createApp(db: Db, sync?: SyncService): Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const bicicletaRepository = new BicicletaRepositoryMongo(db);
  const estacionRepository = new EstacionRepositoryMongo(db);
  const bicicletaService = new BicicletaService(bicicletaRepository, estacionRepository);
  const bicicletaController = new BicicletaController(bicicletaService);
  const bicicletaRoutes = new BicicletaRoutes(bicicletaController);

  const estacionService = new EstacionService(estacionRepository, bicicletaRepository);
  const estacionController = new EstacionController(estacionService);
  const estacionRoutes = new EstacionRoutes(estacionController);

  const usuarioRepository = new UsuarioRepositoryMongo(db);
  const usuarioService = new UsuarioService(usuarioRepository);
  const usuarioController = new UsuarioController(usuarioService);
  const usuarioRoutes = new UsuarioRoutes(usuarioController);

  const viajeRepository = new ViajeRepositoryMongo(db);
  const userRepository = new UserRepositoryMongo(db);
  const viajeService = new ViajeService(
    viajeRepository,
    bicicletaRepository,
    estacionRepository,
    usuarioRepository,
    userRepository
  );
  const viajeController = new ViajeController(viajeService);
  const viajeRoutes = new ViajeRoutes(viajeController);

  const mantenimientoRepository = new MantenimientoRepositoryMongo(db);
  const mantenimientoService = new MantenimientoService(mantenimientoRepository, bicicletaRepository);
  const mantenimientoController = new MantenimientoController(mantenimientoService);
  const mantenimientoRoutes = new MantenimientoRoutes(mantenimientoController);

  app.get('/', (_req, res) => {
    res.json({
      message: 'Bike rental API is running',
      version: '1.0.0',
      endpoints: {
        bicycles: '/api/bicycles',
        bicicletas: '/api/bicicletas',
        stations: '/api/estaciones',
        users: '/api/users',
        usuarios: '/api/usuario',
        maintenance: '/api/maintenance',
        mantenimientos: '/api/mantenimientos',
        trips: '/api/viajes'
      }
    });
  });

  app.use('/api', bicicletaRoutes.router);
  app.use('/api', usuarioRoutes.router);
  app.use('/api', estacionRoutes.router);
  app.use('/api', viajeRoutes.router);
  app.use('/api', mantenimientoRoutes.router);

  app.use('/api', createBicycleRoutes(db));
  app.use('/api/maintenance', createMaintenanceRoutes(db));
  app.use('/api/users', createUserRoutes(db));
  if (sync) app.use('/api/sync', createSyncRoutes(sync));

  return app;
}

export async function ensureApplicationIndexes(db: Db): Promise<void> {
  await Promise.all([
    new UsuarioRepositoryMongo(db).ensureIndexes(),
    new ViajeRepositoryMongo(db).ensureIndexes()
  ]);
}
