const Bicycle = require("../models/Bicycle");

const createBicycle = async (req, res) => {
  try {
    const { codigo, estacionActual, codigoDesbloqueo } = req.body;

    if (!codigo || !estacionActual || !codigoDesbloqueo) {
      return res.status(400).json({
        message: "codigo, estacionActual y codigoDesbloqueo son obligatorios",
      });
    }

    const bicycle = await Bicycle.create({
      codigo,
      estacionActual,
      codigoDesbloqueo,
      estado: req.body.estado || "DISPONIBLE",
    });

    res.status(201).json({
      message: "Bicicleta creada correctamente",
      data: bicycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al crear bicicleta",
      error: error.message,
    });
  }
};

const getBicycles = async (req, res) => {
  try {
    const bicycles = await Bicycle.find();

    res.json({
      message: "Listado de bicicletas",
      data: bicycles,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener bicicletas",
      error: error.message,
    });
  }
};

const getBicycleById = async (req, res) => {
  try {
    const bicycle = await Bicycle.findById(req.params.id);

    if (!bicycle) {
      return res.status(404).json({
        message: "Bicicleta no encontrada",
      });
    }

    res.json({
      message: "Bicicleta encontrada",
      data: bicycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener bicicleta",
      error: error.message,
    });
  }
};

const updateBicycle = async (req, res) => {
  try {
    const bicycle = await Bicycle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!bicycle) {
      return res.status(404).json({
        message: "Bicicleta no encontrada",
      });
    }

    res.json({
      message: "Bicicleta actualizada correctamente",
      data: bicycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar bicicleta",
      error: error.message,
    });
  }
};

const deleteBicycle = async (req, res) => {
  try {
    const bicycle = await Bicycle.findByIdAndDelete(req.params.id);

    if (!bicycle) {
      return res.status(404).json({
        message: "Bicicleta no encontrada",
      });
    }

    res.json({
      message: "Bicicleta eliminada correctamente",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar bicicleta",
      error: error.message,
    });
  }
};

module.exports = {
  createBicycle,
  getBicycles,
  getBicycleById,
  updateBicycle,
  deleteBicycle,
};