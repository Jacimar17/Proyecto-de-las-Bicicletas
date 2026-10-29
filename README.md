# Sistema de Alquiler de Bicicletas Urbanas

Plataforma integral para la gestión y alquiler de bicicletas urbanas en la ciudad de Venado Tuerto. El proyecto está construido sobre una arquitectura moderna full-stack compuesta por una **API REST en Express y TypeScript**, base de datos en **MongoDB** (con soporte para instancia local o **MongoDB Atlas** y sincronización automática), un **Frontend SPA en Angular 22** con **Angular Material** y **Leaflet**, y una **interfaz de consola interactiva (CLI)**.

---

## Índice

- [Características Principales](#características-principales)
- [Arquitectura y Estructura del Proyecto](#arquitectura-y-estructura-del-proyecto)
- [Requisitos y Configuración](#requisitos-y-configuración)
- [Instalación y Puesta en Marcha](#instalación-y-puesta-en-marcha)
- [Scripts Disponibles](#scripts-disponibles)
- [Datos de Prueba y Seed](#datos-de-prueba-y-seed)
- [Roles y Reglas de Negocio](#roles-y-reglas-de-negocio)
  - [Sistema de Puntuación y Penalizaciones](#sistema-de-puntuación-y-penalizaciones)
  - [Flujo de Desbloqueo Temporal](#flujo-de-desbloqueo-temporal)
  - [Módulo Interactivo de Taller Técnico](#módulo-interactivo-de-taller-técnico)
- [Referencia de la API REST](#referencia-de-la-api-rest)
- [Frontend (Angular 22)](#frontend-angular-22)

---

## Características Principales

- **Autenticación Dual:** Registro e inicio de sesión tradicional mediante DNI/correo y contraseña (encriptada con `bcryptjs` y sesiones con `JWT`), además de inicio de sesión con **Google OAuth 2.0** integrado con *Google Identity Services*.
- **Mapa Interactivo con Leaflet:** Visualización en tiempo real de estaciones activas e inactivas geolocalizadas en Venado Tuerto, con capacidad, disponibilidad de bicicletas e inicio de alquiler directo desde la estación.
- **Códigos de Desbloqueo Dinámicos:** Generación de códigos PIN temporales de 6 dígitos asociados al usuario y a la bicicleta elegida (expiran en 5 minutos y se bloquean tras 5 intentos fallidos consecutivos).
- **Gestión de Viajes y Cronómetro:** Monitoreo del viaje activo con tiempo transcurrido en tiempo real, devolución en cualquier estación habilitada y registro de historial.
- **Sistema de Reputación y Sanciones:** Puntuación de 1 a 10 para cada usuario que premia devoluciones a tiempo (hasta 3 horas) y penaliza demoras con suspensiones temporales escalonadas o bloqueo definitivo de la cuenta.
- **Módulo Técnico con Diagrama Interactivo:** Taller mecánico visual con plano de bicicleta para inspección y asignación de tareas por zonas (`cadena`, `rueda_trasera`, `rueda_delantera`, `manubrio`, `frenos`, `asiento`).
- **Panel Administrativo Completo:** Panel de control con 6 módulos para gestionar usuarios, bicicletas, estaciones (con selector de coordenadas sobre mapa), monitoreo global de viajes, historial de mantenimientos y catálogo de tareas.
- **Sincronización Local / Atlas:** Capacidad de operar conectado a MongoDB local, a MongoDB Atlas o en modo local con sincronizador periódico en segundo plano hacia la nube (`SyncService`).
- **Menú de Consola (CLI):** Interfaz alternativa por terminal para consultar estaciones, iniciar/finalizar viajes y gestionar cuentas.

---

## Arquitectura y Estructura del Proyecto

El repositorio está organizado como un monorepo que alberga la API backend, el cliente frontend y herramientas auxiliares:

```text
Proyecto-de-las-Bicicletas/
├── frontend/                         # Aplicación cliente Angular 22 (SPA)
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/                # Panel de administración (6 secciones)
│   │   │   ├── login/                # Inicio de sesión (DNI/pass y Google)
│   │   │   ├── registro/             # Registro de clientes
│   │   │   ├── mapa/                 # Mapa interactivo de estaciones (Leaflet)
│   │   │   ├── perfil/               # Perfil de usuario, reputación y sanciones
│   │   │   ├── tecnico/              # Taller interactivo de mantenimiento
│   │   │   ├── viajes/               # Historial y gestión de viajes del cliente
│   │   │   └── shared/               # Servicios, guardias de rol e interceptores
│   │   ├── main.ts
│   │   └── styles.css
│   ├── angular.json
│   └── package.json
├── src/                              # Código fuente del Backend (Express + TypeScript)
│   ├── auth/                         # Middlewares y utilidades de autenticación en inglés
│   ├── bicycles/                     # Dominio de bicicletas (rutas ES y EN, controlador, servicio)
│   ├── cli/                          # Menú interactivo por terminal (CLI)
│   ├── common/                       # Manejo centralizado de errores (ApiError)
│   ├── config/                       # Conexión a MongoDB (local/Atlas) y colecciones
│   ├── estacion/                     # Dominio de estaciones (controlador, repositorio, servicio)
│   ├── maintenance/                  # Rutas de mantenimiento en inglés (legacy)
│   ├── mantenimiento/                # Dominio de mantenimientos y catálogo de tareas por zona
│   ├── migrations/                   # Scripts de migración de base de datos
│   ├── sync/                         # Servicio y rutas de sincronización con Atlas
│   ├── trips/                        # Modelo y rutas de viajes en inglés
│   ├── users/                        # Dominio de usuarios en inglés y Google Login
│   ├── usuario/                      # Dominio de usuarios en español y autenticación JWT
│   ├── viaje/                        # Dominio de viajes, códigos temporales de desbloqueo
│   ├── app.ts                        # Configuración de Express, middlewares y rutas
│   └── seed.ts                       # Carga de datos iniciales en la base de datos
├── tests/                            # Pruebas automatizadas (Node.js test runner)
├── Bici mantenimiento.jpg            # Imagen de referencia del taller técnico
├── server.ts                         # Punto de entrada del servidor backend
├── package.json                      # Configuración de scripts y dependencias raíz
└── tsconfig.json                     # Configuración de compilador TypeScript
```

---

## Requisitos y Configuración

### Requisitos Previos

- **Node.js**: Versión 18 o superior (probado en Node.js v20+ / v24).
- **npm**: Gestor de paquetes incluido con Node.js.
- **MongoDB**: Instancia local de MongoDB en ejecución (puerto `27017`) o un clúster de **MongoDB Atlas**.

### Configuración del Entorno (`.env`)

Crea tu archivo `.env` en la raíz del proyecto copiando la plantilla `.env.example`:

```bash
cp .env.example .env
```

Configura las variables según tu entorno:

```ini
# Modo de base de datos: 'local' (predeterminado) o 'atlas'
MONGO_MODE=local

# Nombre de la base de datos
MONGO_DB_NAME=bicicletas

# Conexión local (requerida si MONGO_MODE=local)
LOCAL_MONGO_URI=mongodb://127.0.0.1:27017

# Conexión directa a MongoDB Atlas (requerida si MONGO_MODE=atlas)
# ATLAS_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority

# Clave secreta privada para firmar y verificar tokens JWT
JWT_SECRET=tu-clave-secreta-aleatoria

# Client ID de Google Cloud OAuth 2.0 (Aplicación web para Google Sign-In)
GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com

# Puerto de la API Express
PORT=3000

# URL base consumida por el frontend y el CLI
API_BASE_URL=http://localhost:3000
```

> [!NOTE]
> - **Modo Local:** Utiliza `LOCAL_MONGO_URI`. Si además defines `ATLAS_URI`, se activa automáticamente el servicio de sincronización en segundo plano con Atlas.
> - **Modo Atlas:** Guarda y consulta directamente sobre MongoDB Atlas sin requerir MongoDB instalado localmente. Recuerda habilitar tu dirección IP en **Network Access** en la consola de Atlas.
> - **Google OAuth:** Si no se define `GOOGLE_CLIENT_ID`, el inicio de sesión tradicional con DNI continúa funcionando normalmente y el botón de Google se oculta automáticamente.

---

## Instalación y Puesta en Marcha

### 1. Instalar dependencias

Instala las dependencias tanto en el proyecto raíz (backend) como en la carpeta del frontend:

```bash
# Dependencias del backend y herramientas raíz
npm install

# Dependencias del frontend Angular
npm --prefix frontend install
```

### 2. Poblar la Base de Datos (Seed)

Ejecuta el script de inicialización para crear las estaciones de Venado Tuerto, bicicletas, usuarios de prueba y registros de ejemplo:

```bash
npm run seed
```

### 3. Iniciar la Aplicación

Para ejecutar **Backend y Frontend simultáneamente en modo desarrollo**:

```bash
npm run dev
```

Este comando:
1. Libera automáticamente los puertos `3000` y `4200` en caso de estar ocupados (`kill-port`).
2. Inicia el backend con `nodemon` en `http://localhost:3000` con recarga automática.
3. Inicia el frontend Angular en `http://localhost:4200`.

Abre tu navegador en: **`http://localhost:4200`**

---

## Scripts Disponibles

| Script | Descripción |
| --- | --- |
| `npm run dev` | Inicia backend y frontend en paralelo con `concurrently`, liberando puertos `3000` y `4200` previamente. |
| `npm run start:backend` | Inicia únicamente la API Express con `nodemon` y `ts-node` en desarrollo. |
| `npm run start:frontend` | Inicia únicamente el frontend Angular (`ng serve`). |
| `npm start` | Inicia la API backend en modo producción / ejecución directa (`node -r ts-node/register server.ts`). |
| `npm run menu` | Inicia el menú interactivo por consola (CLI). |
| `npm run seed` | Carga las cuentas por defecto, 5 estaciones activas, 10 barrios, 50 bicicletas y datos de muestra sin borrar colecciones. |
| `npm run migrate:bicis-admin` | Script de migración para normalizar códigos de bicicletas (`BICI - 01`) y asignar rol administrador por DNI. |
| `npm test` | Ejecuta las pruebas del backend en `tests/` y `test/`. |
| `npm run build` | Valida tipos TypeScript en el backend (`tsc --noEmit`). |
| `npm --prefix frontend test` | Ejecuta las pruebas unitarias del frontend con **Vitest**. |
| `npm --prefix frontend run build` | Compila la aplicación Angular para producción en `frontend/dist/`. |

---

## Datos de Prueba y Seed

Al ejecutar `npm run seed`, la base de datos se inicializa con los siguientes datos:

### Usuarios Preconfigurados

| Rol | Correo / DNI | Contraseña | Descripción |
| --- | --- | --- | --- |
| **Administrador** | `admin@bicicletas.com` (DNI: `10000001`) | `admin123` | Control total del sistema, usuarios, estaciones y catálogo. |
| **Técnico** | `tecnico@bicicletas.com` (DNI: `10000002`) | `admin123` | Acceso al taller interactivo de reparaciones y cambios de estado. |
| **Cliente** | `papu@example.com` (DNI: `12345678`) | `papu1234` | Cliente regular para alquilar y devolver bicicletas. |

*(La contraseña por defecto de admin y técnico se puede personalizar con la variable `SEED_ADMIN_PASSWORD`)*.

### Estaciones Sembradas (Venado Tuerto)

- **Activas (con 10 bicicletas cada una y capacidad de 10):**
  - Centro (San Martín y Belgrano)
  - San Martín (Av. San Martín 1200)
  - Belgrano (Belgrano y Mitre)
  - Tiro Federal (Av. Circunvalación 500)
  - Juan XXIII (Juan XXIII y Libertad)
- **Inactivas (barrios planificados para habilitación futura):**
  - Barrio Norte, Barrio Sur, Hipódromo, Ferroviario, Güemes, Jardín, San Cayetano, Quirno Costa, Villa Casey, Parque.

---

## Roles y Reglas de Negocio

### 1. Cliente
- Registro público e inicio de sesión (vía credenciales o Google).
- Consulta de mapa interactivo con disponibilidad de bicicletas por estación en tiempo real.
- Generación de código temporal de desbloqueo y retiro de bicicleta.
- Devolución en cualquier estación que tenga capacidad disponible.
- Monitoreo del viaje activo con cronómetro en pantalla.
- Consulta de historial de viajes y perfil personal con puntaje de conducta.

### 2. Técnico
- Acceso restringido al módulo de taller (`/tecnico`).
- Selección de estación y bicicleta a intervenir.
- Inspección por componentes en el diagrama de la bicicleta.
- Asignación de tareas realizadas y cambio de estado (`DISPONIBLE` o `EN_MANTENIMIENTO`).
- Reubicación de la bicicleta a una estación tras completar reparaciones.

### 3. Administrador
- Acceso exclusivo al panel integral (`/admin`).
- **Usuarios:** CRUD de usuarios, asignación y cambio de roles (`cliente`, `admin`, `tecnico`), bloqueo y desbloqueo de cuentas.
- **Bicicletas:** CRUD de bicicletas, asignación de estación y actualización de estado.
- **Estaciones:** CRUD de estaciones, activación/desactivación, capacidad y selector interactivo de coordenadas (`lat`, `lng`) sobre mapa Leaflet.
- **Viajes:** Auditoría y listado de todos los viajes registrados en el sistema.
- **Mantenimientos:** Historial detallado de intervenciones técnicas.
- **Tareas:** Alta y baja de tareas predefinidas en el catálogo por zona de la bicicleta.

---

### Sistema de Puntuación y Penalizaciones

Cada usuario comienza con una puntuación máxima de **10 puntos**:
- **Devolución a tiempo (≤ 3 horas):** Suma **+1 punto** (hasta el máximo de 10).
- **Devolución con demora (> 3 horas):** Resta **-1 punto**.

**Escala de suspensiones según el puntaje:**
- **4 puntos:** Suspensión de la cuenta por **1 día**.
- **3 puntos:** Suspensión de la cuenta por **2 días**.
- **2 puntos:** Suspensión de la cuenta por **3 días**.
- **1 punto:** **Bloqueo definitivo** de la cuenta (no puede volver a iniciar viajes).

---

### Flujo de Desbloqueo Temporal

Para evitar fraudes o uso de códigos estáticos impresos:
1. El cliente selecciona una bicicleta disponible en una estación activa.
2. Solicita un código mediante `POST /api/viajes/codigo-desbloqueo`.
3. El sistema genera un PIN numérico de 6 dígitos con **vigencia de 5 minutos**, visible en pantalla con cuenta regresiva.
4. El PIN queda vinculado exclusivamente al usuario autenticado y a esa bicicleta.
5. Al enviar el formulario de inicio de viaje (`POST /api/viajes`), el código se valida e invalida de inmediato.
6. Si se ingresa erróneamente 5 veces consecutivas, el código se bloquea por seguridad.

---

### Módulo Interactivo de Taller Técnico

El módulo de mantenimiento técnico (`/tecnico`) ofrece una vista con el plano de la bicicleta estructurado en 6 zonas clave:

- `cadena`: Lubricar, tensionar cadena, cambiar cadena.
- `rueda_trasera`: Inflar neumático, colocar parche, cambio de cubierta.
- `rueda_delantera`: Inflar neumático, colocar parche, cambio de cubierta.
- `manubrio`: Ajustar manubrio, cambiar puños.
- `frenos`: Ajustar frenos, cambiar pastillas de freno.
- `asiento`: Ajustar altura, cambiar asiento.

Los técnicos pueden marcar las tareas efectuadas en cada zona, actualizar el estado de la bicicleta y asignarla a una estación de destino con su respectivo registro histórico.

---

## Referencia de la API REST

Todas las rutas protegidas requieren el encabezado:
```http
Authorization: Bearer <token_jwt>
```

### Autenticación y Usuarios

| Método | Endpoint | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/usuario/registro` | Público | Registro de cliente con DNI, nombre, email y contraseña. |
| `POST` | `/api/usuario/login` | Público | Inicio de sesión con DNI y contraseña; retorna JWT y datos del usuario. |
| `POST` | `/api/users/login/google` | Público | Inicio de sesión / registro automático mediante credencial OAuth de Google. |
| `GET` | `/api/usuario/perfil` | Autenticado | Obtiene los datos del usuario conectado, puntuación y estado de sanción. |
| `GET` | `/api/usuario` | Administrador | Listado de todos los usuarios registrados. |
| `POST` | `/api/usuario` | Administrador | Creación manual de un usuario con asignación de rol. |
| `GET` | `/api/usuario/:id` | Administrador | Obtener detalles de un usuario específico. |
| `PUT` | `/api/usuario/:id` | Administrador | Modificar datos, rol (`cliente`, `admin`, `tecnico`) o estado de bloqueo. |
| `DELETE` | `/api/usuario/:id` | Administrador | Eliminar usuario por ID. |

### Estaciones

| Método | Endpoint | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/estaciones` | Público | Listar todas las estaciones con su disponibilidad de bicicletas en tiempo real. |
| `GET` | `/api/estacion/:id` | Público | Obtener detalle de una estación y el listado de bicicletas asociadas. |
| `POST` | `/api/estacion` | Administrador | Crear nueva estación (nombre, barrio, dirección, `lat`, `lng`, capacidad, activa). |
| `PUT` | `/api/estacion/:id` | Administrador | Actualizar datos, ubicación o estado activo/inactivo de una estación. |
| `DELETE` | `/api/estacion/:id` | Administrador | Eliminar una estación por ID. |

### Bicicletas

| Método | Endpoint | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/bicicletas` | Público | Consultar todas las bicicletas registradas y su estado. |
| `POST` | `/api/bicicleta` | Administrador | Dar de alta una nueva bicicleta asignada a una estación. |
| `PUT` | `/api/bicicleta/:id` | Administrador | Modificar datos, estación asignada o estado operativo de la bicicleta. |
| `DELETE` | `/api/bicicleta/:id` | Administrador | Eliminar una bicicleta del sistema. |

### Viajes y Alquileres

| Método | Endpoint | Acceso | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/viajes/codigo-desbloqueo` | Cliente | Genera un PIN temporal de 6 dígitos (válido por 5 minutos) para una bicicleta. |
| `POST` | `/api/viajes` | Cliente | Inicia un viaje con `bicicleta_id`, `estacion_origen_id` y `codigo_desbloqueo`. |
| `GET` | `/api/viajes/activo` | Cliente | Consulta el viaje en curso del usuario autenticado (si existe). |
| `PATCH` | `/api/viajes/activo/finalizar` | Cliente | Finaliza el viaje activo indicando la `estacion_destino_id` y actualiza puntuación. |
| `GET` | `/api/viajes` | Cliente | Consulta el historial completo de viajes del usuario autenticado. |
| `GET` | `/api/viajes/todos` | Administrador | Monitoreo global de todos los viajes realizados en la plataforma. |
| `GET` | `/api/viajes/mis-viajes` | Cliente | Endpoint de compatibilidad para el menú de consola (CLI). |
| `PATCH` | `/api/viajes/:id/devolver` | Cliente | Finalización de viaje por ID (compatibilidad CLI). |

### Mantenimiento y Taller

| Método | Endpoint | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/mantenimientos` | Admin / Técnico | Listado histórico de intervenciones de mantenimiento realizadas. |
| `POST` | `/api/mantenimientos` | Técnico | Registra cambio de estado (`DISPONIBLE`/`EN_MANTENIMIENTO`), tareas por zona y estación. |
| `GET` | `/api/tareas-mantenimiento` | Admin / Técnico | Consulta el catálogo de tareas disponibles agrupadas por zona. |
| `POST` | `/api/tareas-mantenimiento` | Administrador | Da de alta una nueva tarea para una zona específica de la bicicleta. |
| `DELETE` | `/api/tareas-mantenimiento/:id` | Administrador | Da de baja una tarea del catálogo. |

### Sincronización y Rutas Legacy

| Método | Endpoint | Acceso | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/sync/status` | Público | Consulta el estado del servicio de sincronización local/Atlas y última réplica. |
| `POST` | `/api/sync` | Público | Dispara manualmente la sincronización bidireccional de datos con Atlas. |
| `GET/POST/PUT/DELETE` | `/api/bicycles/*` | Admin / Técnico | Rutas en inglés heredadas para compatibilidad con scripts existentes. |
| `PATCH` | `/api/maintenance/:id/suitable` | Admin / Técnico | Marca bicicleta como apta/disponible (ruta legacy en inglés). |
| `PATCH` | `/api/maintenance/:id/not-suitable` | Admin / Técnico | Marca bicicleta como en mantenimiento (ruta legacy en inglés). |

---

## Frontend (Angular 22)

La interfaz web fue desarrollada en **Angular 22** con componentes independientes (*standalone components*), **Angular Material** y consumo de servicios reactivos con RxJS.

### Rutas de la Aplicación

- **`/mapa`**: Pantalla principal. Muestra el mapa interactivo de Venado Tuerto, pines de estaciones con disponibilidad de bicis, selector de estación y modal directo para generar código e iniciar viaje.
- **`/login`**: Formulario de ingreso con DNI o botón de inicio de sesión con Google.
- **`/registro`**: Formulario de alta para nuevos clientes.
- **`/viajes`**: Panel del cliente donde visualiza su viaje en curso con contador de tiempo, botón de entrega en estación seleccionada e historial con duración de cada recorrido.
- **`/perfil`**: Información del usuario, estado de la cuenta (activo, suspendido o bloqueado) y medidor visual de reputación (1-10 puntos).
- **`/tecnico`**: Taller interactivo para el personal técnico. Incluye selector de estación y bicicleta, gráfico interactivo de la bici con zonas clickeables y lista de verificación de tareas de reparación.
- **`/admin`**: Panel de control con pestañas para administración de usuarios, bicicletas, estaciones (con mapa interactivo para marcar latitud y longitud), viajes, mantenimientos y catálogo de tareas.

Para iniciar exclusivamente el frontend en modo desarrollo:

```bash
cd frontend
npm start
```

La aplicación se servirá en `http://localhost:4200/`.

---

## Licencia

Proyecto desarrollado bajo licencia ISC.
