# Reparto de endpoints y ramas

Este reparto propone tres áreas de trabajo para Jacinto, Lautaro y Luka. Cada persona puede crear su rama feature desde `main` cuando comience esa tarea. La guía define límites para que cada rama tenga un dueño claro y reduce los cambios simultáneos en módulos compartidos.

## Jacinto — autenticación, usuarios y roles

**Rama sugerida:** `feature/usuarios-auth`

**Rutas**

| Método | Endpoint | Función |
| --- | --- | --- |
| `POST` | `/api/usuario/registro` | Registrar un cliente |
| `POST` | `/api/usuario/login` | Iniciar sesión y emitir token |
| `GET` | `/api/usuario` | Listar usuarios (administrador) |
| `POST` | `/api/usuario` | Crear usuario (administrador) |
| `GET` | `/api/usuario/:id` | Consultar usuario (administrador) |
| `PUT` | `/api/usuario/:id` | Modificar usuario (administrador) |
| `DELETE` | `/api/usuario/:id` | Eliminar usuario (administrador) |

**Área principal:** `src/usuario/` y el flujo de inicio/cierre de sesión y gestión de usuarios en `frontend/src/app/`.

**Responsabilidades:** validación de credenciales, roles `cliente`/`admin`/`tecnico`, middleware de autorización y protección de rutas de interfaz. El alta pública debe seguir creando únicamente clientes.

## Lautaro — bicicletas y estaciones

**Rama sugerida:** `feature/bicicletas-estaciones`

**Rutas**

| Método | Endpoint | Función |
| --- | --- | --- |
| `GET` | `/api/bicicletas` | Consultar bicicletas |
| `POST` | `/api/bicicleta` | Crear bicicleta (administrador) |
| `PUT` | `/api/bicicleta/:id` | Modificar bicicleta (administrador) |
| `DELETE` | `/api/bicicleta/:id` | Eliminar bicicleta (administrador) |
| `GET` | `/api/estaciones` | Consultar estaciones y disponibilidad |
| `GET` | `/api/estacion/:id` | Consultar estación y sus bicicletas |
| `POST` | `/api/estacion` | Crear estación (administrador) |
| `PUT` | `/api/estacion/:id` | Modificar estación (administrador) |
| `DELETE` | `/api/estacion/:id` | Eliminar estación (administrador) |

**Área principal:** `src/bicycles/` (endpoints y modelo español/inglés), `src/estacion/` y sus servicios de frontend. Coordinar los formularios de bicicletas/estaciones del panel de administración con Jacinto para no editar a la vez el mismo componente de administración.

**Responsabilidades:** CRUD, capacidad/estación, disponibilidad, ubicaciones y estados de bicicleta. Una bicicleta en mantenimiento no debe contarse ni mostrarse como disponible para alquiler.

## Luka — viajes y mantenimiento

**Rama sugerida:** `feature/viajes-mantenimiento`

**Rutas**

| Método | Endpoint | Función |
| --- | --- | --- |
| `GET` | `/api/viajes` | Consultar el historial propio (cliente) |
| `GET` | `/api/viajes/activo` | Consultar el viaje activo (cliente) |
| `POST` | `/api/viajes` | Iniciar viaje con `bicicleta_id` y `estacion_origen_id` (cliente) |
| `PATCH` | `/api/viajes/activo/finalizar` | Finalizar con `estacion_destino_id` (cliente) |
| `GET` | `/api/mantenimientos` | Consultar registros (administrador o técnico) |
| `POST` | `/api/mantenimientos` | Actualizar bicicleta con `bicicleta_id` y `estado` (técnico) |

**Área principal:** `src/viaje/`, `src/mantenimiento/`, `frontend/src/app/viajes/` y `frontend/src/app/tecnico/`; coordinar con Lautaro las transiciones de estado en `src/bicycles/`.

**Responsabilidades:** persistir origen/destino y horas de inicio/finalización, evitar más de un viaje activo por cliente, permitir devolución solo en estación habilitada y registrar para cada mantenimiento el estado anterior/nuevo, fecha y técnico responsable.

## Integración y trabajo en equipo

1. Partir de `main` actualizado y crear una rama por área con los nombres sugeridos.
2. Limitar cada cambio a los módulos de su área. Si se necesita editar un archivo compartido —por ejemplo `src/app.ts`, `src/usuario/auth.middleware.ts`, `frontend/src/app/app.routes.ts`, `frontend/src/app/app.component.*` o el panel común de administración—, coordinarlo primero y evitar que dos ramas lo cambien en paralelo.
3. Mantener las interfaces API alineadas con esta guía y notificar cambios de payload antes de consumirlos desde otra rama.
4. Probar la API y el frontend del área antes de abrir la integración; ejecutar builds y pruebas generales al integrar.
5. Integrar mediante pull request o merge a `main`; no compartir una rama feature como si fuera la rama principal de trabajo.

Esta división es una propuesta de trabajo, no una restricción: el equipo puede intercambiar responsables, manteniendo los límites de archivos acordados para evitar conflictos.
