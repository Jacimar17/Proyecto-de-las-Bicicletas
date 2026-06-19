# Characters API

REST API para gestionar personajes RPG, construida con Node.js + TypeScript + Express + PostgreSQL.

## Requisitos

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## Opción A — Con Docker (recomendado, todo en uno)

Levanta la base de datos **y** la app con un solo comando:

```bash
docker compose up --build
```

La API queda disponible en: `http://localhost:3000`

Para detenerlo:
```bash
docker compose down
```

> Si querés borrar también los datos de la DB:
> ```bash
> docker compose down -v
> ```

---

## Opción B — Solo la DB en Docker, la app en local

**1. Levantar PostgreSQL:**
```bash
docker compose up db
```

**2. Instalar dependencias:**
```bash
npm install
```

**3. Correr la app en modo desarrollo:**
```bash
npm run dev
```

La API queda disponible en: `http://localhost:3000`

---

## Endpoints

| Método | Ruta                  | Descripción           |
|--------|-----------------------|-----------------------|
| GET    | `/api/characters`     | Listar todos          |
| GET    | `/api/character/:id`  | Obtener por ID        |
| POST   | `/api/character`      | Crear personaje       |
| PUT    | `/api/character/:id`  | Actualizar personaje  |
| DELETE | `/api/character/:id`  | Eliminar personaje    |

### Ejemplo — Crear personaje

```http
POST http://localhost:3000/api/character
Content-Type: application/json

{
  "name": "Aragorn",
  "nickname": "Strider",
  "class_name": "Ranger",
  "race": "Human",
  "level": 20,
  "experience_points": 95000,
  "health_points": 250,
  "mana_points": 80,
  "strength": 18,
  "agility": 16,
  "intelligence": 14,
  "defense": 17,
  "is_alive": true,
  "avatar_url": null,
  "backstory": "Heir of Isildur, raised in Rivendell."
}
```

---

## Variables de entorno (opcional)

Si querés personalizar la conexión a la DB, creá un archivo `.env` en la raíz:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=characters_db
```
