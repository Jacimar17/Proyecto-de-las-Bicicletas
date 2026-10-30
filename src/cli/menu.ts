import { ApiClient } from "./api-client";
import { ask, closePrompt } from "./terminal";
import type { Bicycle, SessionUser, Station, Trip, User } from "./types";

// Usuario con sesión iniciada (token incluido)
let currentUser: SessionUser | null = null;
const apiClient = new ApiClient(() => currentUser?.token ?? null);

// ---------- Utilidades ----------
function print(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

function apiFetch(
  path: string,
  method = "GET",
  body: Record<string, unknown> | null = null
): ReturnType<ApiClient["request"]> {
  return apiClient.request(path, method, body);
}

function showBicycles(bicycles: Bicycle[]): void {
  if (bicycles.length === 0) {
    console.log("No hay bicicletas registradas.\n");
    return;
  }
  bicycles.forEach((bicycle, i) => {
    console.log(`\n--- Bicicleta ${i + 1} ---`);
    console.log(`ID: ${bicycle.id}`);
    console.log(`Código: ${bicycle.codigo}`);
    console.log(`Modelo: ${bicycle.modelo}`);
    console.log(`Ubicación: ${bicycle.ubicacion}`);
    console.log(`Estado: ${bicycle.estado.replace(/_/g, " ")}`);
  });
  console.log("");
}

async function getBicycles(): Promise<Bicycle[] | null> {
  const { status, data } = await apiFetch("/api/bicycles");
  if (status !== 200 || !Array.isArray(data)) {
    print(data);
    return null;
  }
  return data as Bicycle[];
}

// ---------- FLUJO: Login ----------
async function doLogin(): Promise<boolean> {
  console.log("\n===== INICIO DE SESIÓN =====");
  console.log("(Si aún no tienes cuenta, elige la opción de registro en el menú principal)");

  const email = await ask("Email: ");
  const password = await ask("Contraseña: ");

  const { status, data } = await apiFetch("/api/users/login", "POST", { email, password });

  if (status === 200 && data.user && data.token) {
    currentUser = {
      token: data.token,
      email: data.user.email,
      nombre: data.user.nombre,
      role: data.role || data.user.role || "cliente",
    };
    console.log(`\n¡Bienvenido, ${currentUser.nombre}! Rol: ${currentUser.role.toUpperCase()}\n`);
    return true;
  }
  console.log(`\nError: ${data.message || data.error || "No se pudo iniciar sesión"}\n`);
  return false;
}

function isAdmin(): boolean {
  return currentUser?.role === "admin";
}

// ---------- MENÚ CLIENTE ----------
async function clientMenu(): Promise<"login" | "exit"> {
  while (true) {
    const user = currentUser;
    if (!user) return "login";
    console.log("\n========= MENÚ CLIENTE =========");
    console.log(`Usuario: ${user.nombre} (${user.email})`);
    console.log("1. Ver estaciones y bicicletas disponibles");
    console.log("2. Iniciar un viaje");
    console.log("3. Devolver bicicleta");
    console.log("4. Consultar mi historial de viajes");
    console.log("5. Ver mi perfil");
    console.log("6. Cerrar sesión");
    console.log("7. Salir");
    const opt = await ask("\nSelecciona una opción: ");

    switch (opt) {
      case "1":
        await clientViewStationsAndBicycles();
        break;
      case "2":
        await clientStartTrip();
        break;
      case "3":
        await clientFinishTrip();
        break;
      case "4":
        await clientTripHistory();
        break;
      case "5":
        await viewProfile();
        break;
      case "6":
        currentUser = null;
        console.log("\nSesión cerrada.\n");
        return "login";
      case "7":
        return "exit";
      default:
        console.log("Opción no válida.");
    }
  }
}

async function getStations(): Promise<Station[] | null> {
  const { status, data } = await apiFetch("/api/stations");
  if (status !== 200) {
    print(data);
    return null;
  }
  if (!Array.isArray(data)) {
    console.log("\nLa API devolvió un listado de estaciones no válido.\n");
    return null;
  }
  return data as Station[];
}

async function getActiveStations(): Promise<Station[] | null> {
  const stations = await getStations();
  return stations?.filter((station) => station.activa) ?? null;
}

function showStations(stations: Station[]): void {
  stations.forEach((station, index) => {
    console.log(`${index + 1}. ${station.nombre} - ${station.barrio} (${station.direccion})`);
  });
}

async function chooseStation(stations: Station[]): Promise<Station | null> {
  if (stations.length === 0) {
    console.log("\nNo hay estaciones habilitadas.\n");
    return null;
  }
  showStations(stations);
  const selection = await ask("\nSelecciona el número de la estación: ");
  const index = Number(selection) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= stations.length) {
    console.log("\nSelección de estación no válida.\n");
    return null;
  }
  return stations[index];
}

async function getStationDetails(stationId: string): Promise<Station | null> {
  const { status, data } = await apiFetch(`/api/stations/${stationId}`);
  if (status !== 200) {
    print(data);
    return null;
  }
  return data as unknown as Station;
}

async function clientViewStationsAndBicycles(): Promise<void> {
  const stations = await getActiveStations();
  if (!stations) return;
  if (stations.length === 0) {
    console.log("\nNo hay estaciones habilitadas.\n");
    return;
  }

  console.log("\n----- ESTACIONES Y BICICLETAS DISPONIBLES -----");
  for (const station of stations) {
    const details = await getStationDetails(station.id);
    if (!details) continue;
    const available = (details.bicicletas || []).filter((bicycle) => bicycle.estado === "DISPONIBLE");
    console.log(`\n${station.nombre} - ${station.direccion}`);
    if (available.length === 0) {
      console.log("  No hay bicicletas disponibles.");
      continue;
    }
    available.forEach((bicycle) => {
      console.log(`  ${bicycle.codigo} | ${bicycle.modelo} | ID: ${bicycle.id}`);
    });
  }
  console.log("");
}

async function clientStartTrip(): Promise<void> {
  const stations = await getActiveStations();
  if (!stations) return;
  console.log("\n----- INICIAR VIAJE -----");
  const station = await chooseStation(stations);
  if (!station) return;

  const details = await getStationDetails(station.id);
  if (!details) return;
  const available = (details.bicicletas || []).filter((bicycle) => bicycle.estado === "DISPONIBLE");
  if (available.length === 0) {
    console.log("\nNo hay bicicletas disponibles en esta estación.\n");
    return;
  }

  console.log(`\nBicicletas disponibles en ${station.nombre}:`);
  available.forEach((bicycle, index) => {
    console.log(`${index + 1}. ${bicycle.codigo} - ${bicycle.modelo} (ID: ${bicycle.id})`);
  });
  const selection = Number(await ask("\nSelecciona el número de la bicicleta: ")) - 1;
  if (!Number.isInteger(selection) || selection < 0 || selection >= available.length) {
    console.log("\nSelección de bicicleta no válida.\n");
    return;
  }

  const bicycle = available[selection];
  const confirm = await ask(`¿Iniciar un viaje con ${bicycle.codigo}? (si/no): `);
  if (confirm.toLowerCase() !== "si") {
    console.log("\nViaje cancelado.\n");
    return;
  }
  const generatedCode = await apiFetch("/api/trips/unlock-code", "POST", {
    bicicleta_id: bicycle.id,
  });
  if (generatedCode.status !== 201 || !generatedCode.data.codigo) {
    print(generatedCode.data);
    return;
  }
  console.log(`\nCódigo de desbloqueo (vence ${new Date(generatedCode.data.expira_en || "").toLocaleTimeString()}): ${generatedCode.data.codigo}`);
  const unlockCode = await ask("Ingresá el código generado (4 dígitos): ");
  const { status, data } = await apiFetch("/api/trips", "POST", {
    bicicleta_id: bicycle.id,
    codigo_desbloqueo: unlockCode,
  });
  if (status === 201) {
    console.log("\nViaje iniciado.");
    console.log(`Origen: ${station.nombre}`);
    console.log(`Fecha y hora de inicio: ${new Date(data.fecha_inicio || "").toLocaleString()}\n`);
  } else {
    print(data);
  }
}

async function clientFinishTrip(): Promise<void> {
  const { status: activeStatus, data: activeData } = await apiFetch("/api/trips/active");
  if (activeStatus !== 200) {
    print(activeData);
    return;
  }
  const activeTrip = activeData as unknown as Trip | null;
  if (!activeTrip) {
    console.log("\nNo tienes viajes activos para finalizar.\n");
    return;
  }

  const stations = await getActiveStations();
  if (!stations) return;
  console.log(`\n----- DEVOLVER BICICLETA ${activeTrip.bicicleta_id} -----`);
  console.log("Selecciona la estación habilitada donde dejarás la bicicleta:");
  const station = await chooseStation(stations);
  if (!station) return;

  const { status, data } = await apiFetch("/api/trips/active/finish", "PATCH", {
    estacion_destino_id: station.id,
  });
  if (status === 200) {
    console.log("\nBicicleta devuelta; viaje finalizado.");
    console.log(`Destino: ${station.nombre}`);
    console.log(`Fecha y hora de finalización: ${new Date(data.fecha_fin as string).toLocaleString()}\n`);
    console.log(`Puntuación actual: ${data.puntuacion ?? "no disponible"}/10`);
    if (data.bloqueado) {
      console.log("Tu cuenta quedó bloqueada. Contacta a un administrador.\n");
    } else if (data.suspendidoHasta && new Date(data.suspendidoHasta).getTime() > Date.now()) {
      console.log(`Tu cuenta está suspendida hasta: ${new Date(data.suspendidoHasta).toLocaleString()}\n`);
    }
  } else {
    print(data);
  }
}

async function clientTripHistory(): Promise<void> {
  const { status, data } = await apiFetch("/api/trips");
  if (status !== 200 || !Array.isArray(data)) {
    print(data);
    return;
  }
  const trips = data as Trip[];
  if (trips.length === 0) {
    console.log("\nTodavía no tienes viajes registrados.\n");
    return;
  }

  const stations = await getStations();
  if (!stations) return;
  const stationName = (id: string | null) =>
    stations.find((station) => station.id === id)?.nombre || id || "Pendiente";
  console.log("\n----- HISTORIAL DE VIAJES -----");
  trips.forEach((trip, index) => {
    console.log(`\n${index + 1}. Bicicleta: ${trip.bicicleta_id}`);
    console.log(`   Origen: ${stationName(trip.estacion_origen_id)}`);
    console.log(`   Inicio: ${new Date(trip.fecha_inicio).toLocaleString()}`);
    console.log(`   Destino: ${stationName(trip.estacion_destino_id)}`);
    console.log(`   Finalización: ${trip.fecha_fin ? new Date(trip.fecha_fin).toLocaleString() : "Viaje activo"}`);
  });
  console.log("");
}

// ---------- MENÚ ADMIN ----------
async function adminMenu(): Promise<"login" | "exit"> {
  while (true) {
    const user = currentUser;
    if (!user) return "login";
    console.log("\n========= MENÚ ADMINISTRADOR =========");
    console.log(`Administrador: ${user.nombre}`);
    console.log("1. Ver estado de todas las bicicletas");
    console.log("2. Marcar bicicleta como DISPONIBLE (apta)");
    console.log("3. Marcar bicicleta EN MANTENIMIENTO (no apta)");
    console.log("4. Gestión de bicicletas (CRUD)");
    console.log("5. Gestión de usuarios (CRUD)");
    console.log("6. Cerrar sesión");
    console.log("7. Salir");
    const opt = await ask("\nSelecciona una opción: ");

    switch (opt) {
      case "1":
        await adminViewAllBicycles();
        break;
      case "2":
        await adminMarkStatus("DISPONIBLE");
        break;
      case "3":
        await adminMarkStatus("EN_MANTENIMIENTO");
        break;
      case "4":
        await adminBicycleCrud();
        break;
      case "5":
        await adminUserCrud();
        break;
      case "6":
        currentUser = null;
        console.log("\nSesión cerrada.\n");
        return "login";
      case "7":
        return "exit";
      default:
        console.log("Opción no válida.");
    }
  }
}

async function adminViewAllBicycles(): Promise<void> {
  const bicycles = await getBicycles();
  if (!bicycles) return;
  console.log("\n----- ESTADO DE TODAS LAS BICICLETAS -----");
  showBicycles(bicycles);
}

async function adminMarkStatus(targetStatus: "DISPONIBLE" | "EN_MANTENIMIENTO"): Promise<void> {
  const bicycleId = await ask("Ingresa el ID de la bicicleta: ");
  const { status, data } = await apiFetch("/api/maintenance", "POST", {
    bicicleta_id: bicycleId,
    estado: targetStatus,
  });

  if (status === 201) {
    console.log(`\nEstado actualizado: ${targetStatus.replace(/_/g, " ")}\n`);
  } else if (status === 403) {
    console.log("\nAcceso denegado: no tienes permisos de administrador.\n");
  } else {
    print(data);
  }
}

async function adminBicycleCrud(): Promise<void> {
  let running = true;

  while (running) {
    console.log("\n----- GESTIÓN DE BICICLETAS -----");
    console.log("1. Crear bicicleta");
    console.log("2. Listar bicicletas");
    console.log("3. Ver bicicleta por ID");
    console.log("4. Actualizar bicicleta");
    console.log("5. Eliminar bicicleta");
    console.log("6. Volver al menú principal");
    const opt = await ask("\nOpción: ");

    switch (opt) {
      case "1":
        await createBicycleFlow();
        break;
      case "2":
        await adminViewAllBicycles();
        break;
      case "3":
        await getBicycleFlow();
        break;
      case "4":
        await updateBicycleFlow();
        break;
      case "5":
        await deleteBicycleFlow();
        break;
      case "6":
        running = false;
        break;
      default:
        console.log("Opción no válida.");
    }
  }
}

async function createBicycleFlow(): Promise<void> {
  const codigo = await ask("Código: ");
  const modelo = await ask("Modelo: ");
  const stations = await getStations();
  if (!stations) return;
  const station = await chooseStation(stations);
  if (!station) return;
  const estado = await ask("Estado (DISPONIBLE/EN_MANTENIMIENTO/APTA/NO_APTA) [Enter = DISPONIBLE]: ");

  const { status, data } = await apiFetch("/api/bicycles", "POST", {
    codigo,
    modelo,
    ubicacion: station.nombre,
    estado: estado || "DISPONIBLE",
    estacion_id: station.id,
    fecha_ultima_revision: null,
    tecnico_responsable: null,
  });

  if (status === 201) {
    console.log(`\nBicicleta creada correctamente. ID: ${(data as unknown as Bicycle).id}\n`);
  } else {
    print(data);
  }
}

async function getBicycleFlow(): Promise<void> {
  const id = await ask("ID de la bicicleta: ");
  const bicycles = await getBicycles();
  if (!bicycles) return;
  const bicycle = bicycles.find((item) => item.id === id);
  if (bicycle) {
    showBicycles([bicycle]);
  } else {
    console.log("\nBicicleta no encontrada.\n");
  }
}

async function updateBicycleFlow(): Promise<void> {
  const id = await ask("ID de la bicicleta: ");
  const codigo = await ask("Nuevo código (Enter = no cambiar): ");
  const modelo = await ask("Nuevo modelo (Enter = no cambiar): ");
  const estado = await ask("Nuevo estado (Enter = no cambiar): ");

  const body: Record<string, string> = {};
  if (codigo) body.codigo = codigo;
  if (modelo) body.modelo = modelo;
  if (estado) body.estado = estado;

  if (Object.keys(body).length === 0) {
    console.log("No se hicieron cambios.\n");
    return;
  }

  const { status, data } = await apiFetch(`/api/bicycles/${id}`, "PUT", body);
  if (status === 200) {
    console.log("\nBicicleta actualizada correctamente.\n");
  } else {
    print(data);
  }
}

async function deleteBicycleFlow(): Promise<void> {
  const id = await ask("ID de la bicicleta a eliminar: ");
  const confirm = await ask(`¿Seguro que deseas eliminar la bicicleta ${id}? (si/no): `);
  if (confirm.toLowerCase() !== "si") {
    console.log("Eliminación cancelada.\n");
    return;
  }
  const { status, data } = await apiFetch(`/api/bicycles/${id}`, "DELETE");
  if (status === 204) {
    console.log("\nBicicleta eliminada correctamente.\n");
  } else {
    print(data);
  }
}

async function adminUserCrud(): Promise<void> {
  let running = true;

  while (running) {
    console.log("\n----- GESTIÓN DE USUARIOS -----");
    console.log("1. Crear usuario");
    console.log("2. Listar usuarios");
    console.log("3. Ver usuario por ID");
    console.log("4. Actualizar usuario");
    console.log("5. Eliminar usuario");
    console.log("6. Volver al menú principal");
    const opt = await ask("\nOpción: ");

    switch (opt) {
      case "1":
        await registerUser();
        break;
      case "2":
        await listAllUsers();
        break;
      case "3":
        await getUserByIdFlow();
        break;
      case "4":
        await updateUserFlow();
        break;
      case "5":
        await deleteUserFlow();
        break;
      case "6":
        running = false;
        break;
      default:
        console.log("Opción no válida.");
    }
  }
}

async function listAllUsers(): Promise<void> {
  const { status, data } = await apiFetch("/api/users");
  if (status === 200 && Array.isArray(data)) {
    const users = data as User[];
    console.log(`\n----- USUARIOS (${users.length}) -----`);
    users.forEach((u, i) => {
      console.log(`\n${i + 1}. ${u.nombre} ${u.apellido ?? ""} (${u.email})`);
      console.log(`   ID: ${u.id} | Rol: ${u.role || "cliente"}`);
    });
    console.log("");
  } else {
    print(data);
  }
}

async function getUserByIdFlow(): Promise<void> {
  const id = await ask("ID del usuario: ");
  const { status, data } = await apiFetch(`/api/users/${id}`);
  if (status === 200) {
    const u = data as unknown as User;
    console.log("\n----- USUARIO -----");
    console.log(`ID: ${u.id}`);
    console.log(`Nombre: ${u.nombre} ${u.apellido ?? ""}`);
    console.log(`Email: ${u.email}`);
    console.log(`Rol: ${u.role || "cliente"}`);
    console.log("");
  } else {
    print(data);
  }
}

async function updateUserFlow(): Promise<void> {
  const id = await ask("ID del usuario a actualizar: ");
  const nombre = await ask("Nuevo nombre (Enter = no cambiar): ");
  const apellido = await ask("Nuevo apellido (Enter = no cambiar): ");
  const email = await ask("Nuevo email (Enter = no cambiar): ");
  const password = await ask("Nueva contraseña (Enter = no cambiar): ");

  const body: Record<string, string> = {};
  if (nombre) body.nombre = nombre;
  if (apellido) body.apellido = apellido;
  if (email) body.email = email;
  if (password) body.password = password;

  const { status, data } = await apiFetch(`/api/users/${id}`, "PUT", body);
  if (status === 200) {
    console.log("\nUsuario actualizado correctamente.\n");
  } else {
    print(data);
  }
}

async function deleteUserFlow(): Promise<void> {
  const id = await ask("ID del usuario a eliminar: ");
  const confirm = await ask(`¿Seguro que deseas eliminar el usuario ${id}? (si/no): `);
  if (confirm.toLowerCase() !== "si") {
    console.log("Eliminación cancelada.\n");
    return;
  }
  const { status, data } = await apiFetch(`/api/users/${id}`, "DELETE");
  if (status === 204) {
    console.log("\nUsuario eliminado correctamente.\n");
  } else {
    print(data);
  }
}

// ---------- Perfil / Registro compartidos ----------
async function registerUser(): Promise<void> {
  console.log("\n----- REGISTRO DE USUARIO -----");
  const nombre = await ask("Nombre: ");
  const apellido = await ask("Apellido: ");
  const dni = await ask("DNI (opcional): ");
  const email = await ask("Email: ");
  const password = await ask("Contraseña (mín. 6 caracteres): ");

  const { status, data } = await apiFetch("/api/users/register", "POST", {
    nombre,
    apellido,
    ...(dni ? { dni } : {}),
    email,
    password,
  });

  if (status === 201) {
    console.log(`\nUsuario creado correctamente. ID: ${(data as unknown as User).id}\n`);
  } else {
    print(data);
  }
}

async function viewProfile(): Promise<void> {
  const { status, data } = await apiFetch("/api/users/profile");
  if (status !== 200) {
    print(data);
    return;
  }
  const me = data as unknown as User;
  console.log("\n----- MI PERFIL -----");
  console.log(`Nombre: ${me.nombre} ${me.apellido ?? ""}`);
  console.log(`Email: ${me.email}`);
  console.log(`Rol: ${me.role || "cliente"}`);
  console.log(`Puntuación: ${me.puntuacion ?? 10}/10`);
  if (me.bloqueado) {
    console.log("Estado: Cuenta bloqueada");
  } else if (me.suspendidoHasta && new Date(me.suspendidoHasta).getTime() > Date.now()) {
    console.log(`Estado: Suspendida hasta ${new Date(me.suspendidoHasta).toLocaleString()}`);
  }
  console.log("");
}

// ---------- MENÚ PRINCIPAL ----------
export async function runMenu(): Promise<void> {
  try {
    let running = true;

    while (running) {
      console.log("\n========= SISTEMA DE BICICLETAS COMPARTIDAS DE VENADO TUERTO =========");
      console.log("1. Iniciar sesión");
      console.log("2. Registrar nuevo usuario");
      console.log("3. Salir");
      const opt = await ask("\nSelecciona una opción: ");

      switch (opt) {
        case "1": {
          const ok = await doLogin();
          if (ok) {
            const next = isAdmin() ? await adminMenu() : await clientMenu();
            if (next === "exit") running = false;
          }
          break;
        }
        case "2":
          await registerUser();
          break;
        case "3":
          console.log("\n¡Hasta luego!\n");
          running = false;
          break;
        default:
          console.log("Opción no válida.");
      }
    }
  } finally {
    closePrompt();
  }
}
