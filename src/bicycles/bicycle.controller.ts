import { Request, Response } from "express";
import { Db, MongoServerError, ObjectId } from "mongodb";
import { BicycleDocument, BicycleRepositoryMongo } from "./bicycle.repository.mongo";
import { Bicycle, BicycleStatus } from "./bicycle.model";
import { Bicicleta, EstadoBicicleta } from "./bicicleta.entity";
import { BicicletaRepositoryMongo } from "./bicicleta.repository.mongo";

const statuses: BicycleStatus[] = ["AVAILABLE", "IN_USE", "NOT_SUITABLE"];

function isBicycleStatus(value: unknown): value is BicycleStatus {
  return typeof value === "string" && statuses.includes(value as BicycleStatus);
}

const spanishStatuses: EstadoBicicleta[] = [
  "DISPONIBLE",
  "RESERVADA",
  "EN_USO",
  "APTA",
  "NO_APTA",
];

function isSpanishStatus(value: unknown): value is EstadoBicicleta {
  return typeof value === "string" && spanishStatuses.includes(value as EstadoBicicleta);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getRequestId(req: Request): string | null {
  const id = req.params.id;
  return typeof id === "string" ? id : null;
}

function asPublicBicycle(document: BicycleDocument): Record<string, unknown> {
  const { _id, ...fields } = document;
  const id = _id?.toString();
  return { ...fields, _id: id, id };
}

export class BicycleController {
  private readonly legacyBicycles: BicycleRepositoryMongo;
  private readonly spanishBicycles: BicicletaRepositoryMongo;

  constructor(db: Db) {
    this.legacyBicycles = new BicycleRepositoryMongo(db);
    this.spanishBicycles = new BicicletaRepositoryMongo(db);
  }

  create = async (req: Request, res: Response): Promise<void> => {
    const { code, currentStation, unlockCode } = req.body;
    const status: unknown = req.body.status ?? "AVAILABLE";
    if (
      typeof code !== "string" ||
      !code.trim() ||
      typeof currentStation !== "string" ||
      !currentStation.trim() ||
      typeof unlockCode !== "string" ||
      !unlockCode.trim() ||
      !isBicycleStatus(status)
    ) {
      res.status(400).json({
        message: "code, currentStation, unlockCode and a valid status are required",
      });
      return;
    }

    try {
      const bicycle = await this.legacyBicycles.create({
        code: code.trim(),
        currentStation: currentStation.trim(),
        unlockCode: unlockCode.trim(),
        status,
        rentedBy: null,
      });
      res.status(201).json({
        message: "Bicycle created successfully",
        data: { ...bicycle, id: bicycle._id },
      });
    } catch (error: unknown) {
      if (error instanceof MongoServerError && error.code === 11000) {
        res.status(409).json({ message: "A bicycle with this code already exists" });
        return;
      }
      res.status(500).json({ message: "Error creating bicycle", error: errorMessage(error) });
    }
  };

  getAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      const bicycles = await this.legacyBicycles.findAll();
      res.json({
        message: "Bicycle list",
        data: bicycles.map((bicycle) => ({ ...bicycle, id: bicycle._id })),
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Error getting bicycles", error: errorMessage(error) });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = getRequestId(req);
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid bicycle ID" });
      return;
    }
    try {
      const bicycle = await this.legacyBicycles.findById(id);
      if (!bicycle) {
        res.status(404).json({ message: "Bicycle not found" });
        return;
      }
      res.json({ message: "Bicycle found", data: { ...bicycle, id: bicycle._id } });
    } catch (error: unknown) {
      res.status(500).json({ message: "Error getting bicycle", error: errorMessage(error) });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = getRequestId(req);
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid bicycle ID" });
      return;
    }
    const updates: Partial<Bicycle> = {};
    for (const field of ["code", "currentStation", "unlockCode"] as const) {
      const value: unknown = req.body[field];
      if (value !== undefined) {
        if (typeof value !== "string" || !value.trim()) {
          res.status(400).json({ message: `${field} must be a non-empty string` });
          return;
        }
        updates[field] = value.trim();
      }
    }
    if (req.body.status !== undefined) {
      if (!isBicycleStatus(req.body.status)) {
        res.status(400).json({ message: "Invalid bicycle status" });
        return;
      }
      updates.status = req.body.status;
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: "At least one bicycle field must be updated" });
      return;
    }

    try {
      const bicycle = await this.legacyBicycles.update(id, updates);
      if (!bicycle) {
        res.status(404).json({ message: "Bicycle not found" });
        return;
      }
      res.json({ message: "Bicycle updated successfully", data: { ...bicycle, id } });
    } catch (error: unknown) {
      res.status(500).json({ message: "Error updating bicycle", error: errorMessage(error) });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = getRequestId(req);
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid bicycle ID" });
      return;
    }
    try {
      const deleted = await this.legacyBicycles.delete(id);
      if (!deleted) {
        res.status(404).json({ message: "Bicycle not found" });
        return;
      }
      res.json({ message: "Bicycle deleted successfully" });
    } catch (error: unknown) {
      res.status(500).json({ message: "Error deleting bicycle", error: errorMessage(error) });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const id = getRequestId(req);
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid bicycle ID" });
      return;
    }
    if (!isBicycleStatus(req.body.status)) {
      res.status(400).json({ message: "Invalid bicycle status" });
      return;
    }
    try {
      const bicycle = await this.legacyBicycles.update(id, { status: req.body.status });
      if (!bicycle) {
        res.status(404).json({ message: "Bicycle not found" });
        return;
      }
      res.json({ message: "Bicycle status updated successfully", data: { ...bicycle, id } });
    } catch (error: unknown) {
      res.status(500).json({ message: "Error updating bicycle status", error: errorMessage(error) });
    }
  };

  request = async (req: Request, res: Response): Promise<void> => {
    const id = getRequestId(req);
    const rentedBy = req.body.rentedBy;
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid bicycle ID" });
      return;
    }
    if (typeof rentedBy !== "string" || !rentedBy.trim()) {
      res.status(400).json({ message: "The rentedBy field is required" });
      return;
    }

    try {
      const collection = this.legacyBicycles.getCollection();
      const bicycle = await collection.findOneAndUpdate(
        { _id: new ObjectId(id), status: "AVAILABLE" },
        { $set: { status: "IN_USE", rentedBy: rentedBy.trim(), updatedAt: new Date() } },
        { returnDocument: "after" }
      );
      if (bicycle) {
        res.json({
          message: "Bicycle requested successfully. It is now marked as IN_USE",
          data: asPublicBicycle(bicycle),
        });
        return;
      }
      const existing = await collection.findOne({ _id: new ObjectId(id) });
      if (!existing) {
        res.status(404).json({ message: "Bicycle not found" });
        return;
      }
      res.status(409).json({ message: "The bicycle is not currently available" });
    } catch (error: unknown) {
      res.status(500).json({ message: "Error requesting bicycle", error: errorMessage(error) });
    }
  };

  getSpanishAll = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.spanishBicycles.findAll());
    } catch (error: unknown) {
      res.status(500).json({ message: errorMessage(error) });
    }
  };

  createSpanish = async (req: Request, res: Response): Promise<void> => {
    const { codigo, modelo, ubicacion, estado, estacion_id } = req.body;
    if (
      typeof codigo !== "string" ||
      !codigo.trim() ||
      typeof modelo !== "string" ||
      !modelo.trim() ||
      typeof ubicacion !== "string" ||
      !ubicacion.trim() ||
      !isSpanishStatus(estado)
    ) {
      res.status(400).json({
        message: "codigo, modelo, ubicacion and a valid estado are required",
      });
      return;
    }
    const bicicletaData: Bicicleta = {
      codigo: codigo.trim(),
      modelo: modelo.trim(),
      ubicacion: ubicacion.trim(),
      estado,
      estacion_id: typeof estacion_id === "string" ? estacion_id : null,
      fecha_ultima_revision: null,
      tecnico_responsable: null,
    };
    try {
      const bicicleta = await this.spanishBicycles.create(bicicletaData);
      res.status(201).json(bicicleta);
    } catch (error: unknown) {
      res.status(400).json({ message: errorMessage(error) });
    }
  };

  updateSpanish = async (req: Request, res: Response): Promise<void> => {
    const id = getRequestId(req);
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID de bicicleta no válido" });
      return;
    }
    const updates: Partial<Bicicleta> = {};
    for (const field of ["codigo", "modelo", "ubicacion"] as const) {
      const value: unknown = req.body[field];
      if (value !== undefined) {
        if (typeof value !== "string" || !value.trim()) {
          res.status(400).json({ message: `${field} debe ser un texto no vacío` });
          return;
        }
        updates[field] = value.trim();
      }
    }
    if (req.body.estado !== undefined) {
      if (!isSpanishStatus(req.body.estado)) {
        res.status(400).json({ message: "Estado de bicicleta no válido" });
        return;
      }
      updates.estado = req.body.estado;
    }
    if (req.body.estacion_id !== undefined) {
      if (typeof req.body.estacion_id !== "string" && req.body.estacion_id !== null) {
        res.status(400).json({ message: "La estación asignada no es válida" });
        return;
      }
      updates.estacion_id = req.body.estacion_id;
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: "Debe enviar al menos un campo para actualizar" });
      return;
    }
    try {
      const bicicleta = await this.spanishBicycles.update(
        id,
        updates
      );
      if (!bicicleta) {
        res.status(404).json({ message: "Bicicleta no encontrada" });
        return;
      }
      res.json(bicicleta);
    } catch (error: unknown) {
      res.status(400).json({ message: errorMessage(error) });
    }
  };

  deleteSpanish = async (req: Request, res: Response): Promise<void> => {
    const id = getRequestId(req);
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ message: "ID de bicicleta no válido" });
      return;
    }
    try {
      const deleted = await this.spanishBicycles.delete(id);
      if (!deleted) {
        res.status(404).json({ message: "Bicicleta no encontrada" });
        return;
      }
      res.status(204).send();
    } catch (error: unknown) {
      res.status(500).json({ message: errorMessage(error) });
    }
  };
}
