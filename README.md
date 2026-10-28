# Sistema de Alquiler de Bicicletas Urbanas

Aplicación con API REST Express/TypeScript, MongoDB Atlas, menú de consola y frontend Angular.

## Requisitos y configuración

Usa Node.js y npm. Para conectar con MongoDB Atlas, copia `.env.example` a `.env` y reemplaza `MONGO_URI` por la cadena de conexión de tu cluster:

```text
MONGO_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGO_DB_NAME=bicicletas
JWT_SECRET=<secreto privado para firmar tokens>
PORT=3000
```

La API carga `.env` automáticamente al ejecutar `npm start`. Usa `MONGO_URI` con prioridad; `DATABASE_URL` es aceptada como alternativa. Si ninguna está configurada, la conexión usa `mongodb://127.0.0.1:27017` para desarrollo local.

En Atlas, crea un usuario de base de datos y autoriza la dirección IP del entorno que ejecuta la API en Network Access. Si la contraseña contiene caracteres especiales, codifícalos para URL en la URI. No publiques `.env` ni compartas sus credenciales. `.env` está excluido por `.gitignore`; `.env.example` contiene solo valores de muestra.

Instala las dependencias raíz con `npm install` y las del frontend desde `frontend/` con `npm install`.

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

Las operaciones protegidas requieren `Authorization: Bearer <token>`. El registro público crea cuentas de cliente. Las rutas administrativas requieren rol de administrador.

El menú de consola permite iniciar sesión, consultar estaciones y bicicletas disponibles, iniciar y devolver viajes y consultar el historial. El menú admite tanto las cuentas antiguas de `users` como las cuentas actuales de `usuarios`.

La puntuación comienza en 10 (máximo 10). Una devolución en hasta 3 horas suma un punto; una devolución posterior resta uno. Al llegar a 4, 3 o 2 puntos, la cuenta se suspende por 1, 2 o 3 días, respectivamente. Al llegar a 1 punto, queda bloqueada permanentemente.

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
| `GET` | `/api/viajes/mis-viajes` | Cliente | Historial compatible con el menú de consola |
| `PATCH` | `/api/viajes/:id/devolver` | Cliente | Devolución compatible con el menú de consola |
| `GET` | `/api/mantenimientos` | Administrador/técnico | Consultar actualizaciones de mantenimiento |
| `POST` | `/api/mantenimientos` | Técnico | Actualizar con `bicicleta_id` y `estado` |

El sistema mantiene además rutas inglesas para funcionalidades heredadas (`/api/bicycles`, `/api/maintenance`, `/api/users`). El flujo de viajes y puntuación puede identificar cuentas tanto en la colección antigua `users` como en la colección actual `usuarios`.

## Estructura de la API

El backend está organizado por dominio bajo `src/`. Cada módulo mantiene separadas sus rutas, controladores, servicios, interfaces de repositorio, implementación MongoDB y entidad. Las rutas conectan endpoints y middleware; los controladores traducen HTTP y los servicios concentran validaciones y reglas de negocio.

## División de trabajo

Consulta [TEAM_ENDPOINTS.md](./TEAM_ENDPOINTS.md) para el reparto por responsables, archivos, endpoints y ramas sugeridas.
