const express = require("express");

const router = express.Router();

const {
  getBikeById,
  markSuitable,
  markNotSuitable,
} = require("../controllers/maintenance.controller");

// Buscar bicicleta
router.get("/:id", getBikeById);

// Marcar APTA
router.patch("/:id/suitable", markSuitable);

// Marcar NO APTA
router.patch("/:id/not-suitable", markNotSuitable);

module.exports = router;