const readline = require("readline");

const API_URL = "http://localhost:3000";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Variable global para guardar el usuario logueado (token y email)
let currentUser = null;

// ---------- Utilidades ----------
function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function print(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

// ---------- Llamadas a la API ----------
async function apiFetch(path, method = "GET", body = null, extraHeaders = {}) {
  const headers = { "Content-Type": "application/json", ...extraHeaders };

  if (currentUser && currentUser.token) {
    headers["Authorization"] = `Bearer ${currentUser.token}`;
  }

  const options = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`${API_URL}${path}`, options);
    const data = await res.json();
    return { status: res.status, data };
  } catch (error) {
    return { status: 0, data: { error: "No se pudo conectar con el servidor. ¿Está corriendo `npm start`?" } };
  }
}

function translateStatus(status) {
  const map = {
    AVAILABLE: "DISPONIBLE",
    IN_USE: "EN USO",
    NOT_SUITABLE: "NO APTA",
  };
  return map[status] || status;
}

function showBicycles(bicycles) {
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

  if (status === 200 && data.ok) {
    const userEmail = data.user.email;
    // El usuario admin se reconoce por email y/o por rol
    const role =
      (data.user.role || "cliente").toLowerCase() === "admin" ||
      userEmail.toLowerCase() === "admin@gmail.com"
        ? "admin"
        : "cliente";

    currentUser = {
      token: data.token,
      email: userEmail,
      name: data.user.name,
      role,
    };
    console.log(`\n¡Bienvenido, ${data.user.name}! Rol: ${currentUser.role.toUpperCase()}\n`);
    return true;
  } else {
    console.log(`\nError: ${data.mensaje || data.message || "No se pudo iniciar sesión"}\n`);
    return false;
  }
}

// ---------- Roles ----------
function isAdmin() {
  return (
    currentUser &&
    (currentUser.role === "admin" || currentUser.email.toLowerCase() === "admin@gmail.com")
  );
}

// ---------- MENÚ CLIENTE ----------
async function clientMenu() {
  let running = true;

  while (running) {
    console.log("\n========= MENÚ CLIENTE =========");
    console.log(`Usuario: ${currentUser.name} (${currentUser.email})`);
    console.log("1. Ver bicicletas disponibles");
    console.log("2. Solicitar una bicicleta disponible");
    console.log("3. Ver mi perfil");
    console.log("4. Cerrar sesión");
    console.log("5. Salir");
    const opt = await ask("\nSelecciona una opción: ");

    switch (opt) {
      case "1":
        await clientViewBicycles();
        break;
      case "2":
        await clientRequestBicycle();
        break;
      case "3":
        await viewProfile();
        break;
      case "4":
        currentUser = null;
        console.log("\nSesión cerrada.\n");
        return "login";
      case "5":
        return "exit";
      default:
        console.log("Opción no válida.");
    }
  }
}

async function clientViewBicycles() {
  const { status, data } = await apiFetch("/api/bicycles");
  if (status === 200) {
    const available = (data.data || []).filter((b) => b.status === "AVAILABLE");
    console.log("\n----- BICICLETAS DISPONIBLES -----");
    showBicycles(available);
  } else {
    print(data);
  }
}

async function clientRequestBicycle() {
  // Primero mostrar las disponibles
  const { status, data } = await apiFetch("/api/bicycles");
  if (status !== 200) {
    print(data);
    return;
  }
  const available = (data.data || []).filter((b) => b.status === "AVAILABLE");

  if (available.length === 0) {
    console.log("\nNo hay bicicletas disponibles en este momento.\n");
    return;
  }

  console.log("\n----- BICICLETAS DISPONIBLES -----");
  showBicycles(available);

  const id = await ask("\nIngresa el ID de la bicicleta que deseas solicitar: ");
  const confirm = await ask(`¿Confirmas solicitar la bicicleta ${id}? (si/no): `);
  if (confirm.toLowerCase() !== "si") {
    console.log("Solicitud cancelada.\n");
    return;
  }

  const { status: s, data: d } = await apiFetch(
    `/api/bicycles/${id}/request`,
    "PATCH",
    { rentedBy: currentUser.email }
  );

  if (s === 200) {
    console.log(`\n${d.message}`);
    console.log(`Estado actual: ${translateStatus(d.data.status)}\n`);
  } else if (s === 409) {
    console.log(`\n${d.message}\n`);
  } else {
    print(d);
  }
}

// ---------- MENÚ ADMIN ----------
async function adminMenu() {
  let running = true;

  while (running) {
    console.log("\n========= MENÚ ADMINISTRADOR =========");
    console.log(`Administrador: ${currentUser.name}`);
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
}

async function adminViewAllBicycles() {
  const { status, data } = await apiFetch("/api/bicycles");
  if (status === 200) {
    console.log("\n----- ESTADO DE TODAS LAS BICICLETAS -----");
    showBicycles(data.data);
  } else {
    print(data);
  }
}

async function adminMarkStatus(targetStatus) {
  const bikeId = await ask("Ingresa el ID de la bicicleta: ");
  const technician = await ask("Nombre del técnico: ");

  const action = targetStatus === "AVAILABLE" ? "suitable" : "not-suitable";
  const tech = { technician };

  const { status, data } = await apiFetch(
    `/api/maintenance/${bikeId}/${action}`,
    "PATCH",
    tech,
    { "x-user-email": currentUser.email }
  );

  if (status === 200) {
    console.log(`\n${data.message || "Operación exitosa"}`);
    console.log(`Estado actual: ${translateStatus(data.data.status)}\n`);
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
    console.log(`\nBicicleta creada correctamente. ID: ${data.data._id}\n`);
  } else {
    print(data);
  }
}

async function getBicycleFlow() {
  const id = await ask("ID de la bicicleta: ");
  const { status, data } = await apiFetch(`/api/bicycles/${id}`);
  if (status === 200) {
    showBicycles([data.data]);
  } else {
    print(data);
  }
}

async function updateBicycleFlow() {
  const id = await ask("ID de la bicicleta: ");
  const code = await ask("Nuevo código (Enter = no cambiar): ");
  const currentStation = await ask("Nueva estación (Enter = no cambiar): ");
  const unlockCode = await ask("Nuevo código de bloqueo (Enter = no cambiar): ");

  const body = {};
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

  const body = {};
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
    console.log(`\nUsuario creado correctamente. ID: ${data.user._id}\n`);
  } else {
    print(data);
  }
}

async function viewProfile() {
  if (!currentUser) {
    console.log("No hay sesión activa.\n");
    return;
  }
  // Buscar el perfil por email a través del listado (protegido por token)
  const { status, data } = await apiFetch("/api/users");
  if (status !== 200) {
    print(data);
    return;
  }
  const me = (data.users || []).find((u) => u.email === currentUser.email);
  if (me) {
    console.log("\n----- MI PERFIL -----");
    console.log(`Nombre: ${me.name} ${me.lastName}`);
    console.log(`Email: ${me.email}`);
    console.log(`Rol: ${me.role || "cliente"}`);
    console.log("");
  } else {
    console.log("\nNo se encontró tu perfil.\n");
  }
}

// ---------- MENÚ PRINCIPAL ----------
async function mainMenu() {
  let running = true;

  while (running) {
    console.log("\n========= SISTEMA DE ALQUILER DE BICICLETAS =========");
    console.log("1. Iniciar sesión");
    console.log("2. Registrar nuevo usuario");
    console.log("3. Salir");
    const opt = await ask("\nSelecciona una opción: ");

    switch (opt) {
      case "1":
        const ok = await doLogin();
        if (ok) {
          const next = isAdmin() ? await adminMenu() : await clientMenu();
          if (next === "exit") running = false;
        }
        break;
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

  rl.close();
  process.exit(0);
}

console.log("Conectando a la API en: " + API_URL);
console.log("Asegúrate de que el servidor esté corriendo con `npm start`.\n");
mainMenu();

