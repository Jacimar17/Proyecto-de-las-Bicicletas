const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

/**
 * Controlador CRUD de User (Cliente)
 * Campos: name, email, password.
 */

// CREATE -> POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        ok: false,
        mensaje: "Ya existe un usuario registrado con ese email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
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
