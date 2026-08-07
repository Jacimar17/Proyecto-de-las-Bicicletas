# Plan de trabajo: Menú interactivo con roles (Admin / Cliente)

## Objetivo
Crear un menú CLI que pida login y, según el rol, ofrezca diferentes funcionalidades.

## Datos del Administrador
- Email: `admin@gmail.com`
- Contraseña: `adminpirulo123`
- Rol: `admin`

## Estado de los pasos

### 1. ✅ Editar `src/models/user.model.js`
- Agregar campo `role` con valores `["admin", "cliente"]`, default `"cliente"`.

### 2. ✅ Editar `src/controllers/user.controller.js`
- En `createUser`: si el email es `admin@gmail.com`, asignar `role: "admin"`.
- En `login`: si el email es `admin@gmail.com` y su rol no es `admin`, se corrige a `admin` en la BD. También se incluye `role` en el JWT.

### 3. ✅ Agregar protección de rol en `src/controllers/maintenance.controllers.js`
- En `markSuitable` y `markNotSuitable`: verificar que el email del usuario (header `x-user-email`) sea `admin@gmail.com`. Si no, devolver 403.

### 4. ✅ Crear `menu.js` (raíz)
- Menú CLI interactivo con `readline`.
- Login con email + contraseña (POST `/api/users/login`).
- El admin se reconoce por `role === "admin"` **O** por email `admin@gmail.com` (robusto incluso si el rol no viene en la respuesta).
- Si rol es `admin`:
  - Ver estado de bicicletas
  - Marcar bicicleta APTA / NO APTA
  - CRUD completo de bicicletas
  - CRUD de usuarios
- Si rol es `cliente`:
  - Ver bicicletas disponibles
  - Ver su perfil
- Llamar a la API local `http://localhost:3000`.

### 5. ✅ Editar `package.json`
- Agregar script: `"menu": "node menu.js"`.

### 6. ⏳ Prueba final
- Reiniciar el servidor (`Ctrl+C` y `npm start` de nuevo) para cargar los cambios.
- Ejecutar menú (`npm run menu`).
- Iniciar sesión con `admin@gmail.com` / `adminpirulo123` → debe mostrar MENÚ ADMINISTRADOR.
