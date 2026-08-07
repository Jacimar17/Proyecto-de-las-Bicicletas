const express = require("express");
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  login,
  verifyToken,
} = require("../controllers/user.controller");

// Rutas del CRUD de User (Cliente)
// Montadas bajo /api/users en app.js

router.post("/login", login);
router.post("/", createUser);
router.get("/", verifyToken, getUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
