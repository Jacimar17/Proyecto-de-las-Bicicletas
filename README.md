# Sistema de Alquiler de Bicicletas Urbanas

Aplicación full-stack con API REST en Express/TypeScript, MongoDB y frontend Angular. El sistema permite consultar estaciones y bicicletas, alquilar y devolver bicicletas, consultar viajes, administrar los datos y registrar mantenimiento.

## Requisitos

- Node.js y npm
- MongoDB accesible mediante una URI

## Configuración y ejecución

Configura estas variables de entorno para la API:

| Variable | Descripción |
| --- | --- |
| `MONGO_URI` | URI de conexión a MongoDB |
| `MONGO_DB_NAME` | Nombre de la base de datos |
| `JWT_SECRET` | Secreto privado para firmar y verificar tokens |
| `PORT` | Puerto de la API (opcional; predeterminado: `3000`) |

Instala dependencias en la raíz del proyecto y en `frontend/`. En una terminal inicia la API con `npm run dev`; en otra, inicia Angular desde `frontend/` con `npm start`. El frontend usa `http://localhost:3000/api` como URL de la API.

`npm run seed` carga estaciones y bicicletas de ejemplo. **El seed elimina primero el contenido actual de las colecciones `estaciones` y `bicicletas`; no lo ejecutes sobre datos que quieras conservar.**

## Historias y roles

- **Cliente:** se registra e inicia sesión; puede ver bicicletas disponibles por estación, iniciar un viaje, devolverlo en cualquier estación habilitada y consultar su historial.
- **Administrador:** puede crear, consultar, modificar y eliminar usuarios, bicicletas y estaciones.
- **Técnico:** puede consultar bicicletas y registrar cambios entre `DISPONIBLE` y `EN_MANTENIMIENTO`. Cada cambio conserva bicicleta, estado anterior y nuevo, fecha y técnico responsable. Una bicicleta en mantenimiento no puede alquilarse.

El registro público crea usuarios con rol `cliente`. Los roles `admin` y `tecnico` solo se asignan mediante las operaciones administrativas autenticadas.

## API principal

Los endpoints protegidos requieren `Authorization: Bearer <token>`.

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/usuario/registro` | Público | Crear cuenta cliente |
| `POST` | `/api/usuario/login` | Público | Iniciar sesión y obtener token |
| `GET` | `/api/estaciones` | Público | Consultar estaciones y disponibilidad |
| `GET` | `/api/estacion/:id` | Público | Consultar una estación y sus bicicletas |
| `GET` | `/api/bicicletas` | Público | Consultar bicicletas |
| `GET` | `/api/usuario` y `/api/usuario/:id` | Administrador | Consultar usuarios |
| `POST` | `/api/usuario` | Administrador | Crear usuario |
| `PUT/DELETE` | `/api/usuario/:id` | Administrador | Modificar o eliminar usuario |
| `POST` | `/api/bicicleta` | Administrador | Crear bicicleta |
| `PUT/DELETE` | `/api/bicicleta/:id` | Administrador | Modificar o eliminar bicicleta |
| `POST` | `/api/estacion` | Administrador | Crear estación |
| `PUT/DELETE` | `/api/estacion/:id` | Administrador | Modificar o eliminar estación |
| `GET` | `/api/viajes` | Cliente | Historial propio de viajes |
| `GET` | `/api/viajes/activo` | Cliente | Viaje en curso, o `null` |
| `POST` | `/api/viajes` | Cliente | Iniciar viaje con `bicicleta_id` y `estacion_origen_id` |
| `PATCH` | `/api/viajes/activo/finalizar` | Cliente | Devolver en estación con `estacion_destino_id` |
| `GET` | `/api/mantenimientos` | Administrador o técnico | Consultar registros de mantenimiento |
| `POST` | `/api/mantenimientos` | Técnico | Actualizar bicicleta con `bicicleta_id` y `estado` |

Los viajes guardan usuario, bicicleta, estaciones de origen y destino, y fechas de inicio y finalización. Una bicicleta no disponible, una estación deshabilitada o un segundo viaje activo del mismo cliente son rechazados.

## Validación

- API: `npm run build`
- Pruebas de flujos de viajes y mantenimiento de la API: `npm test`
- Frontend: `npm --prefix frontend run build`
- Pruebas del frontend: `npm --prefix frontend test -- --watch=false`
