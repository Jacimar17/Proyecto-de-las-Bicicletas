const Bicycle = require("../models/Bicycle");

const createBicycle = async (req, res) => {
  try {
    const { code, currentStation, unlockCode, status } = req.body;

    if (!code || !currentStation || !unlockCode) {
      return res.status(400).json({
        message: "code, currentStation and unlockCode are required",
      });
    }

    const bicycle = await Bicycle.create({
      code,
      currentStation,
      unlockCode,
      status: status || "AVAILABLE",
    });

    res.status(201).json({
      message: "Bicycle created successfully",
      data: bicycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating bicycle",
      error: error.message,
    });
  }
};

const getBicycles = async (req, res) => {
  try {
    const bicycles = await Bicycle.find();

    res.json({
      message: "Bicycle list",
      data: bicycles,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error getting bicycles",
      error: error.message,
    });
  }
};

const getBicycleById = async (req, res) => {
  try {
    const bicycle = await Bicycle.findById(req.params.id);

    if (!bicycle) {
      return res.status(404).json({
        message: "Bicycle not found",
      });
    }

    res.json({
      message: "Bicycle found",
      data: bicycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error getting bicycle",
      error: error.message,
    });
  }
};

const updateBicycle = async (req, res) => {
  try {
    const bicycle = await Bicycle.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after',
      runValidators: true,
    });

    if (!bicycle) {
      return res.status(404).json({
        message: "Bicycle not found",
      });
    }

    res.json({
      message: "Bicycle updated successfully",
      data: bicycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating bicycle",
      error: error.message,
    });
  }
};

const deleteBicycle = async (req, res) => {
  try {
    const bicycle = await Bicycle.findByIdAndDelete(req.params.id);

    if (!bicycle) {
      return res.status(404).json({
        message: "Bicycle not found",
      });
    }

    res.json({
      message: "Bicycle deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting bicycle",
      error: error.message,
    });
  }
};

const updateBicycleStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["AVAILABLE", "IN_USE", "NOT_SUITABLE"].includes(status)) {
      return res.status(400).json({
        message: "Invalid bicycle status",
      });
    }

    const bicycle = await Bicycle.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after', runValidators: true }
    );

    if (!bicycle) {
      return res.status(404).json({
        message: "Bicycle not found",
      });
    }

    res.json({
      message: "Bicycle status updated successfully",
      data: bicycle,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating bicycle status",
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
  updateBicycleStatus,
};