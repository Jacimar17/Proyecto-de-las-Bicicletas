import { Request, Response } from "express";
import Bicycle = require("./bicycle.model");

const createBicycle = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
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
  } catch (error: unknown) {
    res.status(500).json({
      message: "Error creating bicycle",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const getBicycles = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const bicycles = await Bicycle.find();

    res.json({
      message: "Bicycle list",
      data: bicycles,
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: "Error getting bicycles",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const getBicycleById = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
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
  } catch (error: unknown) {
    res.status(500).json({
      message: "Error getting bicycle",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const updateBicycle = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
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
  } catch (error: unknown) {
    res.status(500).json({
      message: "Error updating bicycle",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const deleteBicycle = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
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
  } catch (error: unknown) {
    res.status(500).json({
      message: "Error deleting bicycle",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const updateBicycleStatus = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const { status } = req.body;

    if (!["AVAILABLE", "IN_USE", "NOT_SUITABLE"].includes(status)) {
      res.status(400).json({
        message: "Invalid bicycle status",
      });
      return;
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
  } catch (error: unknown) {
    res.status(500).json({
      message: "Error updating bicycle status",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Solicitar (alquilar) una bicicleta disponible. La marca como IN_USE.
const requestBicycle = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const { rentedBy } = req.body;

    if (!rentedBy) {
      return res.status(400).json({
        message: "El campo rentedBy (email del cliente) es obligatorio",
      });
    }

    const bicycle = await Bicycle.findById(req.params.id);

    if (!bicycle) {
      return res.status(404).json({
        message: "Bicycle not found",
      });
    }

    if (bicycle.status !== "AVAILABLE") {
      return res.status(409).json({
        message: "La bicicleta no está disponible en este momento",
      });
    }

    bicycle.status = "IN_USE";
    bicycle.rentedBy = rentedBy;

    await bicycle.save();

    res.json({
      message: "Bicicleta solicitada correctamente. Ahora está marcada como IN_USE (no disponible)",
      data: bicycle,
    });
  } catch (error: unknown) {
    res.status(500).json({
      message: "Error requesting bicycle",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

const bicycleController = {
  createBicycle,
  getBicycles,
  getBicycleById,
  updateBicycle,
  deleteBicycle,
  updateBicycleStatus,
  requestBicycle,
};

export = bicycleController;
