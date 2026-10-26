import express from 'express';
import { MongoClient, Db } from 'mongodb';
import { BicicletaRoutes } from './bicicleta/bicicleta.routes';
import { BicicletaService } from './bicicleta/bicicleta.service';
import { BicicletaController } from './bicicleta/bicicleta.controller';
import { BicicletaRepositoryMongo } from './bicicleta/bicicleta.repository.mongo';
import { UsuarioRoutes } from './usuario/usuario.routes';
import { UsuarioService } from './usuario/usuario.service';
import { UsuarioController } from './usuario/usuario.controller';
import { UsuarioRepositoryMongo } from './usuario/usuario.repository.mongo';
import { EstacionRoutes } from './estacion/estacion.routes';
import { EstacionService } from './estacion/estacion.service';
import { EstacionController } from './estacion/estacion.controller';
import { EstacionRepositoryMongo } from './estacion/estacion.repository.mongo';
import { ViajeRepositoryMongo } from './viaje/viaje.repository.mongo';
import { ViajeService } from './viaje/viaje.service';
import { ViajeController } from './viaje/viaje.controller';
import { ViajeRoutes } from './viaje/viaje.routes';
import { MantenimientoRepositoryMongo } from './mantenimiento/mantenimiento.repository.mongo';
import { MantenimientoService } from './mantenimiento/mantenimiento.service';
import { MantenimientoController } from './mantenimiento/mantenimiento.controller';
import { MantenimientoRoutes } from './mantenimiento/mantenimiento.routes';

export class App {

    public readonly app;
    private client!: MongoClient;
    private db!: Db;

    constructor() {
        this.app = express();
        this.app.use((req, res, next) => {
            const origin = req.headers.origin;
            if (origin === 'http://localhost:4200') {
                res.setHeader('Access-Control-Allow-Origin', origin);
                res.setHeader('Vary', 'Origin');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
            }
            if (req.method === 'OPTIONS') {
                res.sendStatus(204);
                return;
            }
            next();
        });
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    public async start(): Promise<void> {
        const mongoUri = process.env.MONGO_URI;
        const dbName = process.env.MONGO_DB_NAME;
        if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET no está configurado');
        const port = Number(process.env.PORT || 3000);

        if (!mongoUri) throw new Error('MONGO_URI no está configurado');
        if (!dbName) throw new Error('MONGO_DB_NAME no está configurado');
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error('PORT debe ser un puerto válido');
        }

        this.client = new MongoClient(mongoUri);
        await this.client.connect();
        this.db = this.client.db(dbName);
        console.log(`Conectado a MongoDB (${dbName})`);

        await this.setupRoutes();

        this.app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
        });
    }

    private async setupRoutes(): Promise<void> {
        const bicicletaRepository = new BicicletaRepositoryMongo(this.db);
        const estacionRepository = new EstacionRepositoryMongo(this.db);
        const bicicletaService = new BicicletaService(bicicletaRepository, estacionRepository);
        const bicicletaController = new BicicletaController(bicicletaService);
        const bicicletaRoutes = new BicicletaRoutes(bicicletaController);

        const usuarioRepository = new UsuarioRepositoryMongo(this.db);
        await usuarioRepository.ensureIndexes();
        const usuarioService = new UsuarioService(usuarioRepository);
        const usuarioController = new UsuarioController(usuarioService);
        const usuarioRoutes = new UsuarioRoutes(usuarioController);

        const estacionService = new EstacionService(estacionRepository, bicicletaRepository);
        const estacionController = new EstacionController(estacionService);
        const estacionRoutes = new EstacionRoutes(estacionController);

        const viajeRepository = new ViajeRepositoryMongo(this.db);
        await viajeRepository.ensureIndexes();
        const viajeService = new ViajeService(viajeRepository, bicicletaRepository, estacionRepository);
        const viajeController = new ViajeController(viajeService);
        const viajeRoutes = new ViajeRoutes(viajeController);

        const mantenimientoRepository = new MantenimientoRepositoryMongo(this.db);
        const mantenimientoService = new MantenimientoService(mantenimientoRepository, bicicletaRepository);
        const mantenimientoController = new MantenimientoController(mantenimientoService);
        const mantenimientoRoutes = new MantenimientoRoutes(mantenimientoController);

        this.app.use('/api', bicicletaRoutes.router);
        this.app.use('/api', usuarioRoutes.router);
        this.app.use('/api', estacionRoutes.router);
        this.app.use('/api', viajeRoutes.router);
        this.app.use('/api', mantenimientoRoutes.router);
    }

    public async close(): Promise<void> {
        await this.client.close();
    }
}
