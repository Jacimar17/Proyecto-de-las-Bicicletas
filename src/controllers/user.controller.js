const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

/**
 * Controlador CRUD de User (Cliente)
 * Campos: name, lastName, email, password.
 */

// CREATE -> POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { name, lastName, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        ok: false,
        mensaje: "Ya existe un usuario registrado con ese email",
      });
    }

const hashedPassword = await bcrypt.hash(password, 10);

    // Si el email corresponde al administrador, se le asigna el rol admin
    const role = email.toLowerCase() === "admin@gmail.com" ? "admin" : "cliente";

    const newUser = new User({
      name,
      lastName,
      email,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    const userResponse = newUser.toObject();
    delete userResponse.password;

    return res.status(201).json({
      ok: true,
      mensaje: "Usuario creado correctamente",
      user: userResponse,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ ok: false, mensaje: error.message });
    }
    return res.status(500).json({ ok: false, mensaje: "Error al crear el usuario", error: error.message });
  }
};

// READ ALL -> GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    return res.status(200).json({
      ok: true,
      total: users.length,
      users,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: "Error al obtener los usuarios", error: error.message });
  }
};

// READ ONE -> GET /api/users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    }

    return res.status(200).json({ ok: true, user });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({ ok: false, mensaje: "ID de usuario no válido" });
    }
    return res.status(500).json({ ok: false, mensaje: "Error al obtener el usuario", error: error.message });
  }
};

// UPDATE -> PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Si viene password en el body, se hashea antes de guardar
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Usuario actualizado correctamente",
      user,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ ok: false, mensaje: error.message });
    }
    if (error.kind === "ObjectId") {
      return res.status(400).json({ ok: false, mensaje: "ID de usuario no válido" });
    }
    return res.status(500).json({ ok: false, mensaje: "Error al actualizar el usuario", error: error.message });
  }
};

// DELETE -> DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ ok: false, mensaje: "Usuario no encontrado" });
    }

    return res.status(200).json({
      ok: true,
      mensaje: "Usuario eliminado correctamente",
    });
  } catch (error) {
    if (error.kind === "ObjectId") {
      return res.status(400).json({ ok: false, mensaje: "ID de usuario no válido" });
    }
    return res.status(500).json({ ok: false, mensaje: "Error al eliminar el usuario", error: error.message });
  }
};

/**
 * LOGIN -> POST /api/users/login
 * Acepta dos formas de credenciales:
 *  - { name, lastName, password } (nombre + apellido + contraseña)
 *  - { email, password } (gmail + contraseña)
 * Devuelve un token JWT si las credenciales son válidas.
 */
exports.login = async (req, res) => {
  try {
    const { name, lastName, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ ok: false, mensaje: "La contraseña es obligatoria" });
    }

    // Construcción de la consulta según qué credenciales se provean
    let query = null;

    if (email) {
      query = { email: email.toLowerCase() };
    } else if (name && lastName) {
      query = { name, lastName };
    } else {
      return res.status(400).json({
        ok: false,
        mensaje:
          "Debes proporcionar email y contraseña, o nombre, apellido y contraseña",
      });
    }

    // +password para forzar que se incluya el campo password (tiene select: false)
    const user = await User.findOne(query).select("+password");

if (!user) {
      return res.status(401).json({ ok: false, mensaje: "Credenciales incorrectas" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ ok: false, mensaje: "Credenciales incorrectas" });
    }

    // Si el email es el del administrador, forzamos el rol admin
    // (corrige usuarios admin existentes que se registraron antes de existir el campo role)
    if (user.email.toLowerCase() === "admin@gmail.com" && user.role !== "admin") {
      user.role = "admin";
      await user.save();
    }

    // Generar token JWT
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      ok: true,
      mensaje: "Inicio de sesión exitoso",
      token,
      user: userResponse,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: "Error al iniciar sesión", error: error.message });
  }
};

/**
 * Middleware de autenticación por token JWT.
 * Verifica el header Authorization: Bearer <token>
 */
exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, mensaje: "Token no proporcionado" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, mensaje: "Token inválido o expirado" });
  }
};
