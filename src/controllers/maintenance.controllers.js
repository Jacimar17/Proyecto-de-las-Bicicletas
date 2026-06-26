const Bicycle = require("../models/Bicycle");

// Buscar bicicleta por ID
const getBikeById = async (req, res) => {
  try {
    const bike = await Bicycle.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bicicleta no encontrada",
      });
    }

    res.status(200).json({
      success: true,
      data: bike,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Marcar bicicleta como APTA
const markSuitable = async (req, res) => {
  try {
    const { technician } = req.body;

    const bike = await Bicycle.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bicicleta no encontrada",
      });
    }

    bike.status = "AVAILABLE";
    bike.lastMaintenanceDate = new Date();
    bike.technician = technician;

    await bike.save();

    res.status(200).json({
      success: true,
      message: "Bicicleta marcada como APTA",
      data: bike,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Marcar bicicleta como NO APTA
const markNotSuitable = async (req, res) => {
  try {
    const { technician } = req.body;

    const bike = await Bicycle.findById(req.params.id);

    if (!bike) {
      return res.status(404).json({
        success: false,
        message: "Bicicleta no encontrada",
      });
    }

    bike.status = "NOT_SUITABLE";
    bike.lastMaintenanceDate = new Date();
    bike.technician = technician;

    await bike.save();

    res.status(200).json({
      success: true,
      message: "Bicicleta marcada como NO APTA",
      data: bike,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getBikeById,
  markSuitable,
  markNotSuitable,
};