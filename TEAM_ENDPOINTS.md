# Reparto de historias, tareas y ramas

Este reparto organiza el trabajo según las historias y criterios de aceptación acordados. Cada persona trabaja en una rama feature propia, creada desde `main` actualizado, y limita sus cambios a su historia. Si hace falta tocar un archivo compartido, coordinarlo antes para evitar conflictos.

## Historia de Usuario 1 — Nolla: Usuario / Cliente

**Rama sugerida:** `feature/cliente-nolla`

**Trabajo asignado**

- Registrar una cuenta e iniciar sesión.
- Consultar bicicletas disponibles en una estación.
- Retirar una bicicleta mediante un código de desbloqueo.
- Finalizar el viaje y devolver la bicicleta en la misma estación o en otra.
- Consultar el historial propio de viajes.

**Área principal:** `src/viaje/` y las pantallas de registro, inicio de sesión, mapa y viajes en `frontend/src/app/`.

**Responsabilidades:** experiencia del cliente para alquileres y viajes. Coordinar con Jacinto la autenticación y con Luka las reglas para excluir bicicletas no aptas.

## Historia de Usuario 2 — Jacinto: Administrador

**Rama sugerida:** `feature/admin-jacinto`

**Trabajo asignado**

- Agregar, modificar y eliminar bicicletas.
- Cambiar el estado de una bicicleta.
- Consultar los alquileres activos.
- Bloquear usuarios.
- Gestionar usuarios según el alcance del CRUD de usuarios de la API.

**Área principal:** `src/usuario/`, `src/bicycles/`, `src/viaje/` para la consulta de alquileres activos y el panel `frontend/src/app/admin/`.

**Responsabilidades:** funciones administrativas indicadas en la historia. El registro público siempre debe crear únicamente usuarios cliente. Coordinar con Nolla los cambios de autenticación y con Luka las transiciones de estado de bicicletas. La gestión de estaciones no forma parte de esta historia salvo acuerdo explícito del equipo.

## Historia de Usuario 3 — Luka: Técnico de Mantenimiento

**Rama sugerida:** `feature/tecnico-luka`

**Trabajo asignado**

**Área principal:** `src/mantenimiento/` y `frontend/src/app/tecnico/`.

- Identificar bicicletas mediante su ID.
- Marcar bicicletas según su condición, incluyendo el estado no apto para uso.
- Evitar que bicicletas no aptas se ofrezcan para alquiler.
- Registrar la fecha de revisión y el técnico responsable.

**Responsabilidades:** actualizar el estado de mantenimiento y dejar registro auditable de cada revisión. Coordinar con Jacinto las transiciones de estado y con Nolla la disponibilidad que se muestra al cliente. Los nombres exactos de los estados deben acordarse entre el equipo antes de integrarlos.

## Tarea adicional — Luka: Gestión de estaciones

La gestión de estaciones no es un criterio de aceptación de la HU3 ni una responsabilidad propia del rol de técnico. Se asigna a Luka como tarea adicional e independiente, sin mezclarla con el módulo de mantenimiento.

**Rama sugerida:** `feature/estaciones-luka`

**Rutas**

| Método | Endpoint | Acceso | Función |
| --- | --- | --- | --- |
| `GET` | `/api/estaciones` | Público | Consultar estaciones |
| `GET` | `/api/estacion/:id` | Público | Consultar una estación |
| `POST` | `/api/estacion` | Administrador | Crear una estación |
| `PUT` | `/api/estacion/:id` | Administrador | Modificar una estación |
| `DELETE` | `/api/estacion/:id` | Administrador | Eliminar una estación |

**Área principal:** `src/estacion/` y, si el equipo decide incluirlo, el formulario de estaciones del panel `frontend/src/app/admin/`.

**Responsabilidades:** implementar y probar la gestión de estaciones. Aunque Luka desarrolla esta tarea, las operaciones de escritura siguen protegidas para administradores; no se deben conceder permisos administrativos al rol técnico. Coordinar con Jacinto los cambios al panel compartido de administración.

## Historia Técnica — API REST

La API debe conectar frontend, backend y base de datos; exponer respuestas JSON y cubrir CRUD de usuarios, CRUD de bicicletas y gestión de viajes. Es trabajo compartido entre las tres historias, no una cuarta rama de una persona: cada responsable implementa los endpoints necesarios para su historia y coordina las interfaces comunes.

## Integración y trabajo en equipo

1. Partir de `main` actualizado y trabajar en la rama asignada a cada tarea; no crear ramas adicionales por endpoint sin acordarlo.
2. Limitar cada cambio al área asignada. Coordinar antes de editar archivos compartidos como `src/app.ts`, `src/usuario/auth.middleware.ts`, `frontend/src/app/app.routes.ts`, `frontend/src/app/app.component.*` o componentes comunes.
3. Mantener las interfaces API alineadas con esta guía y notificar cambios de payload antes de consumirlos desde otra rama.
4. Probar la API y el frontend del área antes de integrar; ejecutar builds y pruebas generales al integrar.
5. Integrar mediante pull request o merge a `main`; no usar `main` como rama de trabajo.

Ramas sugeridas: `feature/cliente-nolla`, `feature/admin-jacinto`, `feature/tecnico-luka` y `feature/estaciones-luka`. Jacinto debe continuar en `feature/admin-jacinto`; Luka mantiene su trabajo de mantenimiento en `feature/tecnico-luka` y realiza la tarea independiente de estaciones en `feature/estaciones-luka`.

## Estructura de los módulos del backend

Los módulos bajo `src/` se organizan por dominio. Las rutas enlazan endpoints y middleware con sus controladores; los controladores gestionan HTTP y delegan validaciones y reglas de negocio a servicios; los servicios dependen de interfaces de repositorio, implementadas por sus adaptadores MongoDB, y usan entidades propias del dominio. Las rutas españolas de usuario y las heredadas en inglés se mantienen separadas (`/api/usuario` y `/api/users`) y no comparten montajes duplicados.
