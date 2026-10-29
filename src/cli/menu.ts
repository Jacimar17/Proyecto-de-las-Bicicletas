import { ApiClient } from "./api-client";
import { ask, closePrompt } from "./terminal";
import type {
  ApiData,
  Bicycle,
  PerfilUsuario,
  SessionUser,
  Station,
  Trip,
  User,
} from './types';

// Variable global para guardar el usuario logueado (token y email)
let currentUser: SessionUser | null = null;
const apiClient = new ApiClient(() => currentUser?.token ?? null);

// ---------- Utilidades ----------
function print(obj: unknown): void {
  console.log(JSON.stringify(obj, null, 2));
}

function getBicycles(data: ApiData): Bicycle[] {
  if (Array.isArray(data.data)) return data.data as Bicycle[];
  return data.data ? [data.data as Bicycle] : [];
}

// ---------- Llamadas a la API ----------
function apiFetch(
  path: string,
  method = "GET",
  body: Record<string, unknown> | null = null,
  extraHeaders: Record<string, string> = {}
): ReturnType<ApiClient['request']> {
  return apiClient.request(path, method, body, extraHeaders);
}

function translateStatus(status: string): string {
  const map: Record<string, string> = {
    AVAILABLE: "DISPONIBLE",
    IN_USE: "EN USO",
    NOT_SUITABLE: "NO APTA",
  };
  return map[status] || status;
}

function showBicycles(bicycles: Bicycle[] | undefined): void {
  if (!bicycles || bicycles.length === 0) {
    console.log("No hay bicicletas registradas.\n");
    return;
  }
  bicycles.forEach((b, i) => {
    console.log(`\n--- Bicicleta ${i + 1} ---`);
    console.log(`ID: ${b._id}`);
    console.log(`Código: ${b.code}`);
    console.log(`Estación: ${b.currentStation}`);
    console.log(`Estado: ${translateStatus(b.status)}`);
    console.log(`Código de bloqueo: ${b.unlockCode}`);
    if (b.rentedBy) {
      console.log(`Solicitada por: ${b.rentedBy}`);
    }
  });
  console.log("");
}

// ---------- FLUJO: Login ----------
async function doLogin() {
  console.log("\n===== INICIO DE SESIÓN =====");
  console.log("(Si aún no tienes cuenta, elige la opción de registro en el menú principal)");

  const email = await ask("Email: ");
  const password = await ask("Contraseña: ");

  const { status, data } = await apiFetch("/api/users/login", "POST", { email, password });

  if (status === 200 && data.ok && data.user && data.token) {
    const userEmail = data.user.email;
    // El usuario admin se reconoce por email y/o por rol
    const role =
      (data.user.role || "cliente").toLowerCase() === "admin" ||
      userEmail.toLowerCase() === "admin@gmail.com"
        ? "admin"
        : "cliente";

    const loggedUser: SessionUser = {
      token: data.token,
      email: userEmail,
      name: data.user.name,
      role,
    };
    currentUser = loggedUser;
    console.log(`\n¡Bienvenido, ${loggedUser.name}! Rol: ${loggedUser.role.toUpperCase()}\n`);
    return true;
  } else {
    console.log(`\nError: ${data.mensaje || data.message || "No se pudo iniciar sesión"}\n`);
    return false;
  }
}

// ---------- Roles ----------
function isAdmin(): boolean {
  return Boolean(
    currentUser &&
    (currentUser.role === "admin" || currentUser.email.toLowerCase() === "admin@gmail.com")
  );
}

// ---------- MENÚ CLIENTE ----------
async function clientMenu(): Promise<"login" | "exit"> {
  let running = true;

  while (running) {
    const user = currentUser;
    if (!user) return "login";
    console.log("\n========= MENÚ CLIENTE =========");
    console.log(`Usuario: ${user.name} (${user.email})`);
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
  return "exit";
}

async function getStations(): Promise<Station[] | null> {
  const { status, data } = await apiFetch("/api/estaciones");
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
  const { status, data } = await apiFetch(`/api/estacion/${stationId}`);
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
  const generatedCode = await apiFetch("/api/viajes/codigo-desbloqueo", "POST", {
    bicicletaId: bicycle.id,
  });
  if (generatedCode.status !== 201 || !generatedCode.data.codigo) {
    print(generatedCode.data);
    return;
  }
  console.log(`\nCódigo de desbloqueo (vence ${new Date(generatedCode.data.expira_en || "").toLocaleTimeString()}): ${generatedCode.data.codigo}`);
  const unlockCode = await ask("Ingresá el código generado: ");
  const { status, data } = await apiFetch("/api/viajes", "POST", { bicicletaId: bicycle.id, codigoDesbloqueo: unlockCode });
  if (status === 201) {
    const trip = data.data as Trip;
    console.log(`\n${data.message || "Viaje iniciado"}.`);
    console.log(`Origen: ${station.nombre}`);
    console.log(`Fecha y hora de inicio: ${new Date(trip.fechaInicio).toLocaleString()}\n`);
  } else {
    print(data);
  }
}

async function clientFinishTrip(): Promise<void> {
  const user = currentUser;
  if (!user) return;
  const { status: historyStatus, data: historyData } = await apiFetch("/api/viajes/mis-viajes");
  if (historyStatus !== 200 || !Array.isArray(historyData)) {
    print(historyData);
    return;
  }
  const activeTrip = (historyData as Trip[]).find((trip) => !trip.fechaFin);
  if (!activeTrip) {
    console.log("\nNo tienes viajes activos para finalizar.\n");
    return;
  }

  const stations = await getActiveStations();
  if (!stations) return;
  console.log(`\n----- DEVOLVER BICICLETA ${activeTrip.bicicletaId} -----`);
  console.log("Selecciona la estación habilitada donde dejarás la bicicleta:");
  const station = await chooseStation(stations);
  if (!station) return;

  const { status, data } = await apiFetch(
    `/api/viajes/${activeTrip.id}/devolver`,
    "PATCH",
    { estacionDestinoId: station.id }
  );
  if (status === 200) {
    const trip = data.data as Trip;
    console.log(`\n${data.message || "Viaje finalizado"}.`);
    console.log(`Destino: ${station.nombre}`);
    console.log(`Fecha y hora de finalización: ${new Date(trip.fechaFin as string).toLocaleString()}\n`);
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
  const { status, data } = await apiFetch("/api/viajes/mis-viajes");
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
    console.log(`\n${index + 1}. Bicicleta: ${trip.bicicletaId}`);
    console.log(`   Origen: ${stationName(trip.estacionOrigenId)}`);
    console.log(`   Inicio: ${new Date(trip.fechaInicio).toLocaleString()}`);
    console.log(`   Destino: ${stationName(trip.estacionDestinoId)}`);
    console.log(`   Finalización: ${trip.fechaFin ? new Date(trip.fechaFin).toLocaleString() : "Viaje activo"}`);
  });
  console.log("");
}

// ---------- MENÚ ADMIN ----------
async function adminMenu(): Promise<"login" | "exit"> {
  let running = true;

  while (running) {
    const user = currentUser;
    if (!user) return "login";
    console.log("\n========= MENÚ ADMINISTRADOR =========");
    console.log(`Administrador: ${user.name}`);
    console.log("1. Ver estado de todas las bicicletas");
    console.log("2. Marcar bicicleta como APTA");
    console.log("3. Marcar bicicleta como NO APTA");
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
        await adminMarkStatus("AVAILABLE");
        break;
      case "3":
        await adminMarkStatus("NOT_SUITABLE");
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
  return "exit";
}

async function adminViewAllBicycles() {
  const { status, data } = await apiFetch("/api/bicycles");
  if (status === 200) {
    console.log("\n----- ESTADO DE TODAS LAS BICICLETAS -----");
    showBicycles(getBicycles(data));
  } else {
    print(data);
  }
}

async function adminMarkStatus(targetStatus: string): Promise<void> {
  const user = currentUser;
  if (!user) return;
  const bikeId = await ask("Ingresa el ID de la bicicleta: ");
  const technician = await ask("Nombre del técnico: ");

  const action = targetStatus === "AVAILABLE" ? "suitable" : "not-suitable";
  const tech = { technician };

  const { status, data } = await apiFetch(
    `/api/maintenance/${bikeId}/${action}`,
    "PATCH",
    tech,
    { "x-user-email": user.email }
  );

  if (status === 200) {
    console.log(`\n${data.message || "Operación exitosa"}`);
    const bicycle = getBicycles(data)[0];
    if (bicycle) {
      console.log(`Estado actual: ${translateStatus(bicycle.status)}\n`);
    }
  } else {
    if (status === 403) {
      console.log("\nAcceso denegado: no tienes permisos de administrador.\n");
    } else {
      print(data);
    }
  }
}

async function adminBicycleCrud() {
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

async function createBicycleFlow() {
  const code = await ask("Código: ");
  const currentStation = await ask("Estación actual: ");
  const unlockCode = await ask("Código de bloqueo: ");
  const status = await ask("Estado (AVAILABLE/IN_USE/NOT_SUITABLE) [Enter = AVAILABLE]: ");

  const { status: s, data } = await apiFetch("/api/bicycles", "POST", {
    code,
    currentStation,
    unlockCode,
    status: status || "AVAILABLE",
  });

  if (s === 201) {
    console.log(`\nBicicleta creada correctamente. ID: ${getBicycles(data)[0]?._id}\n`);
  } else {
    print(data);
  }
}

async function getBicycleFlow() {
  const id = await ask("ID de la bicicleta: ");
  const { status, data } = await apiFetch(`/api/bicycles/${id}`);
  if (status === 200) {
    showBicycles(getBicycles(data));
  } else {
    print(data);
  }
}

async function updateBicycleFlow() {
  const id = await ask("ID de la bicicleta: ");
  const code = await ask("Nuevo código (Enter = no cambiar): ");
  const currentStation = await ask("Nueva estación (Enter = no cambiar): ");
  const unlockCode = await ask("Nuevo código de bloqueo (Enter = no cambiar): ");

  const body: Record<string, string> = {};
  if (code) body.code = code;
  if (currentStation) body.currentStation = currentStation;
  if (unlockCode) body.unlockCode = unlockCode;

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

async function deleteBicycleFlow() {
  const id = await ask("ID de la bicicleta a eliminar: ");
  const confirm = await ask(`¿Seguro que deseas eliminar la bicicleta ${id}? (si/no): `);
  if (confirm.toLowerCase() !== "si") {
    console.log("Eliminación cancelada.\n");
    return;
  }
  const { status, data } = await apiFetch(`/api/bicycles/${id}`, "DELETE");
  if (status === 200) {
    console.log("\nBicicleta eliminada correctamente.\n");
  } else {
    print(data);
  }
}

async function adminUserCrud() {
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

async function listAllUsers() {
  const { status, data } = await apiFetch("/api/users");
  if (status === 200) {
    console.log(`\n----- USUARIOS (${data.total}) -----`);
    (data.users || []).forEach((u, i) => {
      console.log(`\n${i + 1}. ${u.name} ${u.lastName} (${u.email})`);
      console.log(`   ID: ${u._id} | Rol: ${u.role || "cliente"}`);
    });
    console.log("");
  } else {
    print(data);
  }
}

async function getUserByIdFlow() {
  const id = await ask("ID del usuario: ");
  const { status, data } = await apiFetch(`/api/users/${id}`);
  if (status === 200) {
    console.log("\n----- USUARIO -----");
    const u = data.user;
    if (!u) {
      print(data);
      return;
    }
    console.log(`ID: ${u._id}`);
    console.log(`Nombre: ${u.name} ${u.lastName}`);
    console.log(`Email: ${u.email}`);
    console.log(`Rol: ${u.role || "cliente"}`);
    console.log("");
  } else {
    print(data);
  }
}

async function updateUserFlow() {
  const id = await ask("ID del usuario a actualizar: ");
  const name = await ask("Nuevo nombre (Enter = no cambiar): ");
  const lastName = await ask("Nuevo apellido (Enter = no cambiar): ");
  const email = await ask("Nuevo email (Enter = no cambiar): ");
  const password = await ask("Nueva contraseña (Enter = no cambiar): ");

  const body: Record<string, string> = {};
  if (name) body.name = name;
  if (lastName) body.lastName = lastName;
  if (email) body.email = email;
  if (password) body.password = password;

  const { status, data } = await apiFetch(`/api/users/${id}`, "PUT", body);
  if (status === 200) {
    console.log("\nUsuario actualizado correctamente.\n");
  } else {
    print(data);
  }
}

async function deleteUserFlow() {
  const id = await ask("ID del usuario a eliminar: ");
  const confirm = await ask(`¿Seguro que deseas eliminar el usuario ${id}? (si/no): `);
  if (confirm.toLowerCase() !== "si") {
    console.log("Eliminación cancelada.\n");
    return;
  }
  const { status, data } = await apiFetch(`/api/users/${id}`, "DELETE");
  if (status === 200) {
    console.log("\nUsuario eliminado correctamente.\n");
  } else {
    print(data);
  }
}

// ---------- Perfil / Registro compartidos ----------
async function registerUser() {
  console.log("\n----- REGISTRO DE USUARIO -----");
  const name = await ask("Nombre: ");
  const lastName = await ask("Apellido: ");
  const email = await ask("Email: ");
  const password = await ask("Contraseña (mín. 6 caracteres): ");

  const { status, data } = await apiFetch("/api/users", "POST", {
    name,
    lastName,
    email,
    password,
  });

  if (status === 201) {
    console.log(`\nUsuario creado correctamente. ID: ${data.user?._id}\n`);
  } else {
    print(data);
  }
}

async function viewProfile() {
  const user = currentUser;
  if (!user) {
    console.log("No hay sesión activa.\n");
    return;
  }
  const { status, data } = await apiFetch("/api/usuario/perfil");
  if (status !== 200) {
    print(data);
    return;
  }
  const me = data as unknown as PerfilUsuario;
  console.log("\n----- MI PERFIL -----");
  console.log(`Nombre: ${me.nombre}`);
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
      console.log("\n========= SISTEMA DE ALQUILER DE BICICLETAS =========");
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
