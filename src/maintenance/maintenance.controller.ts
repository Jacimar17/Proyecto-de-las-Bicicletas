import { Request, Response } from "express";
import { Collection, Db, Document, ObjectId } from "mongodb";

interface BicycleDocument extends Document {
  _id: ObjectId;
  code?: string;
  status?: string;
  lastMaintenanceDate?: Date;
  technician?: string | null;
}

function requestId(req: Request): string | null {
  return typeof req.params.id === "string" ? req.params.id : null;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class MaintenanceController {
  private readonly bicycles: Collection<BicycleDocument>;

  constructor(db: Db) {
    this.bicycles = db.collection<BicycleDocument>("bicycles");
  }

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = requestId(req);
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid bicycle ID" });
      return;
    }
    try {
      const bicycle = await this.bicycles.findOne({ _id: new ObjectId(id) });
      if (!bicycle) {
        res.status(404).json({ success: false, message: "Bicycle not found" });
        return;
      }
      res.status(200).json({
        success: true,
        data: { ...bicycle, _id: bicycle._id.toString() },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, message: message(error) });
    }
  };

  markSuitable = async (req: Request, res: Response): Promise<void> =>
    this.setSuitability(req, res, "AVAILABLE", "Bicicleta marcada como APTA");

  markNotSuitable = async (req: Request, res: Response): Promise<void> =>
    this.setSuitability(req, res, "NOT_SUITABLE", "Bicicleta marcada como NO APTA");

  private async setSuitability(
    req: Request,
    res: Response,
    status: "AVAILABLE" | "NOT_SUITABLE",
    successMessage: string
  ): Promise<void> {
    const id = requestId(req);
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: "Invalid bicycle ID" });
      return;
    }

    const technician: unknown = req.body?.technician;
    if (technician !== undefined && (typeof technician !== "string" || !technician.trim())) {
      res.status(400).json({ success: false, message: "Technician must be a non-empty string" });
      return;
    }

    try {
      const bicycle = await this.bicycles.findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $set: {
            status,
            lastMaintenanceDate: new Date(),
            technician: typeof technician === "string" ? technician.trim() : null,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );
      if (!bicycle) {
        res.status(404).json({ success: false, message: "Bicycle not found" });
        return;
      }
      res.status(200).json({
        success: true,
        message: successMessage,
        data: { ...bicycle, _id: bicycle._id.toString() },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, message: message(error) });
    }
  }
}
