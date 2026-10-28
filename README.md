# Proyecto de bicicletas

API y menú de consola desarrollados en TypeScript, con MongoDB Atlas mediante el driver oficial `mongodb`.

## Configuración

Instala dependencias con `npm install` y define estas variables en un archivo `.env` local:

```text
MONGO_URI=<cadena de conexión de MongoDB Atlas>
MONGO_DB_NAME=bicicletas_db
JWT_SECRET=<secreto para firmar tokens>
PORT=3000
```

No subas el archivo `.env` al repositorio.

## Comandos

- `npm run build`: verifica tipos de la API, el menú y las pruebas.
- `npm test`: ejecuta las pruebas de endpoints y del menú TypeScript.
- `npm start`: inicia la API.
- `npm run menu`: inicia el menú de consola.
- `npm run seed`: crea estaciones y bicicletas de ejemplo que todavía no existan; no elimina ni sobrescribe datos existentes.

## Endpoints

- Bicicletas: `/api/bicycles` y `/api/bicicletas`.
- Mantenimiento: `/api/maintenance`.
- Estaciones: `/api/estaciones` y `/api/estacion`.
- Viajes: `POST /api/viajes`, `PATCH /api/viajes/:id/devolver` y `GET /api/viajes/mis-viajes`.
- Usuarios y autenticación: `/api/users` y `/api/usuario`.

El menú de consola permite iniciar sesión, consultar estaciones y bicicletas disponibles, iniciar y devolver viajes y consultar el historial. Las operaciones de viaje requieren autenticación.

La puntuación de cada usuario comienza en 10 y tiene un máximo de 10. Una devolución en hasta 3 horas suma un punto; una devolución posterior resta uno. Al llegar a 4, 3 o 2 puntos se suspende la cuenta por 1, 2 o 3 días, respectivamente. Al llegar a 1 punto, la cuenta queda bloqueada permanentemente. La puntuación y el estado de suspensión o bloqueo se muestran en el perfil.

Las operaciones protegidas requieren `Authorization: Bearer <token>`. Las acciones de mantenimiento y administración de usuarios requieren un usuario con rol `admin`.

## Ramas de trabajo

- `main`: base integrada y validada.
- `users`: autenticación y endpoints de usuario.
- `feature/bicycles-endpoints`: endpoints de bicicletas.
- `feature/stations-endpoints`: endpoints de estaciones.
- `feature/maintenance-endpoints`: endpoints de mantenimiento.
- `feature/menu-typescript`: menú TypeScript y su validación.
- `feature/typescript-core`: servidor TypeScript y conexión común a Atlas.

Las ramas de recursos parten de la base común de TypeScript y pueden usarse para coordinar cambios por área.
