# Reparto de historias, endpoints y ramas

Este reparto organiza el trabajo por las tres historias de usuario acordadas. Cada persona debe crear su rama feature desde `main` actualizado y limitar sus cambios al área asignada. Si hace falta tocar un archivo compartido, coordinarlo antes para evitar conflictos.

## Historia de Usuario 1 — Nolla: Usuario / Cliente

**Rama sugerida:** `feature/cliente-nolla`

**Rutas**

| Método | Endpoint | Función |
| --- | --- | --- |
| `POST` | `/api/usuario/registro` | Registrar un cliente |
| `POST` | `/api/usuario/login` | Iniciar sesión y obtener JWT |
| `GET` | `/api/estaciones` | Consultar estaciones y disponibilidad |
| `GET` | `/api/estacion/:id` | Consultar una estación y sus bicicletas |
| `GET` | `/api/bicicletas` | Consultar bicicletas disponibles |
| `GET` | `/api/viajes` | Consultar el historial propio |
| `GET` | `/api/viajes/activo` | Consultar el viaje en curso |
| `POST` | `/api/viajes` | Iniciar un viaje con `bicicleta_id` y `estacion_origen_id` |
| `PATCH` | `/api/viajes/activo/finalizar` | Finalizar el viaje con `estacion_destino_id` |

**Área principal:** `src/viaje/` y las pantallas de registro, inicio de sesión, mapa y viajes en `frontend/src/app/`.

**Responsabilidades:** registro público como cliente, inicio de sesión, consulta de disponibilidad, inicio y devolución de bicicletas e historial personal. Coordinar con Jacinto cualquier cambio a la autenticación o a los componentes compartidos del frontend.

## Historia de Usuario 2 — Jacinto: Administrador

**Rama sugerida:** `feature/admin-jacinto`

**Rutas**

| Método | Endpoint | Función |
| --- | --- | --- |
| `GET/POST/PUT/DELETE` | `/api/usuario[/:id]` | Administrar usuarios |
| `POST/PUT/DELETE` | `/api/bicicleta[/:id]` | Administrar bicicletas |
| `POST/PUT/DELETE` | `/api/estacion[/:id]` | Administrar estaciones |

**Área principal:** `src/usuario/` para la gestión administrativa de usuarios, `src/bicycles/`, `src/estacion/` y el panel de administración en `frontend/src/app/admin/`.

**Responsabilidades:** operaciones CRUD administrativas, asignación y protección de roles, y gestión de bicicletas y estaciones. El registro público siempre debe crear únicamente usuarios cliente. Coordinar con Nolla cambios en autenticación, middleware y archivos compartidos del frontend.

## Historia de Usuario 3 — Luka: Técnico de Mantenimiento

**Rama sugerida:** `feature/tecnico-luka`

**Rutas**

| Método | Endpoint | Función |
| --- | --- | --- |
| `GET` | `/api/mantenimientos` | Consultar registros (administrador o técnico) |
| `POST` | `/api/mantenimientos` | Actualizar el estado con `bicicleta_id` y `estado` (técnico) |

**Área principal:** `src/mantenimiento/` y `frontend/src/app/tecnico/`.

**Responsabilidades:** consultar bicicletas y actualizar su estado a `DISPONIBLE` o `EN_MANTENIMIENTO`; registrar el estado anterior y nuevo, la fecha y el técnico responsable. Coordinar con Jacinto cualquier cambio a las transiciones de estado o archivos compartidos.

## Integración y trabajo en equipo

1. Partir de `main` actualizado y crear una rama por historia con los nombres sugeridos.
2. Limitar cada cambio al área asignada. Coordinar antes de editar archivos compartidos como `src/app.ts`, `src/usuario/auth.middleware.ts`, `frontend/src/app/app.routes.ts`, `frontend/src/app/app.component.*` o componentes comunes.
3. Mantener las interfaces API alineadas con esta guía y notificar cambios de payload antes de consumirlos desde otra rama.
4. Probar la API y el frontend del área antes de integrar; ejecutar builds y pruebas generales al integrar.
5. Integrar mediante pull request o merge a `main`; no usar `main` como rama de trabajo.

Esta división identifica responsables por historia, pero requiere coordinación cuando una funcionalidad atraviesa áreas.

## Estructura de los módulos del backend

Los módulos bajo `src/` se organizan por dominio. Las rutas enlazan endpoints y middleware con sus controladores; los controladores gestionan HTTP y delegan validaciones y reglas de negocio a servicios; los servicios dependen de interfaces de repositorio, implementadas por sus adaptadores MongoDB, y usan entidades propias del dominio. Las rutas españolas de usuario y las heredadas en inglés se mantienen separadas (`/api/usuario` y `/api/users`) y no comparten montajes duplicados.
