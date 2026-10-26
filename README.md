# Sistema de Alquiler de Bicicletas Urbanas

Aplicación con API REST Express/TypeScript, MongoDB Atlas, menú de consola y frontend Angular.

## Requisitos y configuración

Usa Node.js y npm, una instancia de MongoDB y las variables de entorno siguientes en un archivo `.env` local:

```text
MONGO_URI=<cadena de conexión de MongoDB>
MONGO_DB_NAME=bicicletas_db
JWT_SECRET=<secreto privado para firmar tokens>
PORT=3000
```

No publiques `.env`. Instala las dependencias raíz con `npm install` y las del frontend desde `frontend/` con `npm install`.

## Comandos

- `npm run build`: verifica tipos de API, menú y pruebas.
- `npm test`: ejecuta pruebas del servidor, endpoints y flujos de alquiler/mantenimiento.
- `npm start`: inicia la API.
- `npm run dev`: inicia la API en desarrollo.
- `npm run menu`: inicia el menú de consola.
- `npm run seed`: agrega estaciones y bicicletas de ejemplo que todavía no existan; no borra datos actuales.
- Desde `frontend/`: `npm start` inicia Angular; `npm test -- --watch=false` ejecuta sus pruebas.

El seed usa MongoDB URI desde `.env`, crea estaciones con coordenadas y evita duplicar bicicletas mediante sus códigos existentes.

## Roles e historias

- **Cliente:** registro, inicio de sesión, disponibilidad por estación, alquiler, devolución en cualquier estación habilitada e historial personal.
- **Administrador:** CRUD de usuarios, bicicletas y estaciones.
- **Técnico:** consultar bicicletas y actualizar a `DISPONIBLE` o `EN_MANTENIMIENTO`; el sistema registra estado anterior/nuevo, fecha y responsable.

Las rutas protegidas requieren `Authorization: Bearer <token>`. El registro público siempre crea usuarios cliente; solo un administrador puede asignar roles privilegiados.

## Endpoints del sistema

Los endpoints en español alimentan la aplicación Angular:

| Método | Endpoint | Acceso | Función |
| --- | --- | --- | --- |
| `POST` | `/api/usuario/registro` | Público | Registrar un cliente |
| `POST` | `/api/usuario/login` | Público | Iniciar sesión y obtener JWT |
| `GET` | `/api/estaciones` | Público | Ver estaciones y disponibilidad |
| `GET` | `/api/estacion/:id` | Público | Ver una estación y sus bicicletas |
| `GET` | `/api/bicicletas` | Público | Consultar bicicletas |
| `GET/POST/PUT/DELETE` | `/api/usuario[/:id]` | Administrador | CRUD de usuarios |
| `POST/PUT/DELETE` | `/api/bicicleta[/:id]` | Administrador | CRUD de bicicletas |
| `POST/PUT/DELETE` | `/api/estacion[/:id]` | Administrador | CRUD de estaciones |
| `GET` | `/api/viajes` | Cliente | Consultar historial propio |
| `GET` | `/api/viajes/activo` | Cliente | Consultar viaje en curso |
| `POST` | `/api/viajes` | Cliente | Iniciar con `bicicleta_id` y `estacion_origen_id` |
| `PATCH` | `/api/viajes/activo/finalizar` | Cliente | Devolver con `estacion_destino_id` |
| `GET` | `/api/mantenimientos` | Administrador/técnico | Consultar actualizaciones de mantenimiento |
| `POST` | `/api/mantenimientos` | Técnico | Actualizar con `bicicleta_id` y `estado` |

El sistema mantiene además rutas inglesas para las funcionalidades heredadas (`/api/bicycles`, `/api/maintenance`, `/api/users`). Esas rutas heredadas utilizan las colecciones inglesas existentes; las rutas nuevas en español utilizan `bicicletas`, `estaciones`, `usuarios`, `viajes` y `mantenimientos`.

## División de trabajo

Consulta [TEAM_ENDPOINTS.md](./TEAM_ENDPOINTS.md) para el reparto por responsables, archivos, endpoints y ramas sugeridas.
