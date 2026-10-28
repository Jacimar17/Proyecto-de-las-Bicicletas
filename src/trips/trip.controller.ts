import { Request, Response } from "express";
import { Db, ObjectId } from "mongodb";
import { Trip } from "./trip.model";

interface BicycleDocument {
  _id: ObjectId;
  estado: string;
  estacion_id: string | null;
  ubicacion?: string;
  usuario_id?: string | null;
  updatedAt?: Date;
}

interface StationDocument {
  _id: ObjectId;
  nombre: string;
  activa: boolean;
}

interface UserDocument {
  _id: ObjectId;
  puntuacion?: number;
  suspendidoHasta?: Date | null;
  bloqueado?: boolean;
}

interface TripDocument extends Omit<Trip, "id"> {
  _id: ObjectId;
}

const MAX_SCORE = 10;
const MIN_SCORE = 1;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

function getId(value: unknown): string | null {
  return typeof value === "string" && ObjectId.isValid(value) ? value : null;
}

function toTrip(document: TripDocument): Trip {
  const { _id, ...trip } = document;
  return { ...trip, id: _id.toString() };
}

export class TripController {
  constructor(private readonly db: Db) {}

  start = async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser?.id;
    const bicycleId = getId(req.body.bicicletaId);
    if (!userId) {
      res.status(401).json({ message: "Debes iniciar sesión" });
      return;
    }
    if (!bicycleId) {
      res.status(400).json({ message: "El ID de la bicicleta no es válido" });
      return;
    }

    const bicycles = this.db.collection<BicycleDocument>("bicicletas");
    const trips = this.db.collection<TripDocument>("viajes");
    try {
      const user = await this.db.collection<UserDocument>("users").findOne({
        _id: new ObjectId(userId),
      });
      if (!user) {
        res.status(404).json({ message: "Usuario no encontrado" });
        return;
      }
      if (user.bloqueado) {
        res.status(403).json({ message: "Tu cuenta está bloqueada y no puede iniciar viajes" });
        return;
      }
      if (user.suspendidoHasta && user.suspendidoHasta.getTime() > Date.now()) {
        res.status(403).json({
          message: "Tu cuenta está suspendida y no puede iniciar viajes",
          suspendidoHasta: user.suspendidoHasta,
          puntuacion: user.puntuacion ?? MAX_SCORE,
        });
        return;
      }
      const activeTrip = await trips.findOne({ usuarioId: userId, fechaFin: null });
      if (activeTrip) {
        res.status(409).json({ message: "Debes devolver tu bicicleta actual antes de iniciar otro viaje" });
        return;
      }

      const bicycle = await bicycles.findOne({ _id: new ObjectId(bicycleId) });
      if (!bicycle) {
        res.status(404).json({ message: "Bicicleta no encontrada" });
        return;
      }
      if (bicycle.estado !== "DISPONIBLE" || !bicycle.estacion_id || !ObjectId.isValid(bicycle.estacion_id)) {
        res.status(409).json({ message: "La bicicleta no está disponible para iniciar un viaje" });
        return;
      }

      const originId = new ObjectId(bicycle.estacion_id);
      const station = await this.db.collection<StationDocument>("estaciones").findOne({
        _id: originId,
        activa: true,
      });
      if (!station) {
        res.status(409).json({ message: "La estación de origen no está habilitada" });
        return;
      }

      const startTime = new Date();
      const updatedBicycle = await bicycles.findOneAndUpdate(
        { _id: new ObjectId(bicycleId), estado: "DISPONIBLE", estacion_id: bicycle.estacion_id },
        { $set: { estado: "EN_USO", usuario_id: userId, updatedAt: startTime } },
        { returnDocument: "after" }
      );
      if (!updatedBicycle) {
        res.status(409).json({ message: "La bicicleta ya no está disponible" });
        return;
      }

      try {
        const trip: Omit<Trip, "id"> = {
          usuarioId: userId,
          bicicletaId: bicycleId,
          estacionOrigenId: bicycle.estacion_id,
          estacionDestinoId: null,
          fechaInicio: startTime,
          fechaFin: null,
        };
        const result = await trips.insertOne({ ...trip, _id: new ObjectId() });
        res.status(201).json({
          message: "Viaje iniciado",
          data: { ...trip, id: result.insertedId.toString() },
        });
      } catch (error) {
        await bicycles.findOneAndUpdate(
          { _id: new ObjectId(bicycleId), estado: "EN_USO", usuario_id: userId },
          { $set: { estado: "DISPONIBLE", usuario_id: null, updatedAt: new Date() } },
          { returnDocument: "after" }
        );
        throw error;
      }
    } catch (error) {
      res.status(500).json({
        message: "No se pudo iniciar el viaje",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  finish = async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser?.id;
    const tripId = getId(req.params.id);
    const destinationId = getId(req.body.estacionDestinoId);
    if (!userId) {
      res.status(401).json({ message: "Debes iniciar sesión" });
      return;
    }
    if (!tripId || !destinationId) {
      res.status(400).json({ message: "El ID del viaje o de la estación no es válido" });
      return;
    }

    const trips = this.db.collection<TripDocument>("viajes");
    const bicycles = this.db.collection<BicycleDocument>("bicicletas");
    try {
      const trip = await trips.findOne({
        _id: new ObjectId(tripId),
        usuarioId: userId,
        fechaFin: null,
      });
      if (!trip) {
        res.status(404).json({ message: "No se encontró un viaje activo para este usuario" });
        return;
      }
      const destination = await this.db.collection<StationDocument>("estaciones").findOne({
        _id: new ObjectId(destinationId),
        activa: true,
      });
      if (!destination) {
        res.status(400).json({ message: "La estación de destino no está habilitada" });
        return;
      }

      const currentBicycle = await bicycles.findOne({
        _id: new ObjectId(trip.bicicletaId),
        estado: "EN_USO",
        usuario_id: userId,
      });
      if (!currentBicycle) {
        res.status(409).json({ message: "No se pudo devolver la bicicleta; verifica su estado" });
        return;
      }

      const finishedAt = new Date();
      const bicycle = await bicycles.findOneAndUpdate(
        {
          _id: new ObjectId(trip.bicicletaId),
          estado: "EN_USO",
          usuario_id: userId,
        },
        {
          $set: {
            estado: "DISPONIBLE",
            estacion_id: destinationId,
            ubicacion: destination.nombre,
            usuario_id: null,
            updatedAt: finishedAt,
          },
        },
        { returnDocument: "after" }
      );
      if (!bicycle) {
        res.status(409).json({ message: "No se pudo devolver la bicicleta; verifica su estado" });
        return;
      }

      const completedTrip = await trips.findOneAndUpdate(
        { _id: new ObjectId(tripId), usuarioId: userId, fechaFin: null },
        { $set: { estacionDestinoId: destinationId, fechaFin: finishedAt } },
        { returnDocument: "after" }
      );
      if (!completedTrip) {
        await bicycles.findOneAndUpdate(
          { _id: new ObjectId(trip.bicicletaId), estado: "DISPONIBLE", estacion_id: destinationId },
          {
            $set: {
              estado: "EN_USO",
              estacion_id: trip.estacionOrigenId,
              ubicacion: currentBicycle.ubicacion,
              usuario_id: userId,
              updatedAt: new Date(),
            },
          },
          { returnDocument: "after" }
        );
        res.status(409).json({ message: "El viaje ya fue finalizado" });
        return;
      }
      const user = await this.db.collection<UserDocument>("users").findOne({
        _id: new ObjectId(userId),
      });
      if (!user) {
        res.status(404).json({ message: "Viaje finalizado, pero no se encontró el usuario para actualizar su puntuación" });
        return;
      }
      const startedAt = new Date(trip.fechaInicio);
      if (!Number.isFinite(startedAt.getTime()) || finishedAt.getTime() < startedAt.getTime()) {
        res.status(500).json({ message: "El viaje finalizó, pero sus fechas no permiten calcular la puntuación" });
        return;
      }

      const currentScore =
        typeof user.puntuacion === "number" && Number.isInteger(user.puntuacion)
          ? Math.max(MIN_SCORE, Math.min(MAX_SCORE, user.puntuacion))
          : MAX_SCORE;
      const completedWithinLimit = finishedAt.getTime() - startedAt.getTime() <= THREE_HOURS_MS;
      const score = completedWithinLimit
        ? Math.min(MAX_SCORE, currentScore + 1)
        : Math.max(MIN_SCORE, currentScore - 1);
      const scoreReachedAt = new Date();
      const suspensionDays: Record<number, number> = { 4: 1, 3: 2, 2: 3 };
      const suspensionUntil = suspensionDays[score]
        ? new Date(scoreReachedAt.getTime() + suspensionDays[score] * 24 * 60 * 60 * 1000)
        : user.suspendidoHasta ?? null;
      const blocked = score === MIN_SCORE || Boolean(user.bloqueado);
      const updatedUser = await this.db.collection<UserDocument>("users").findOneAndUpdate(
        { _id: new ObjectId(userId) },
        {
          $set: {
            puntuacion: score,
            suspendidoHasta: suspensionUntil,
            bloqueado: blocked,
            updatedAt: scoreReachedAt,
          },
        },
        { returnDocument: "after" }
      );
      if (!updatedUser) {
        res.status(500).json({ message: "Viaje finalizado, pero no se pudo actualizar la puntuación del usuario" });
        return;
      }

      res.status(200).json({
        message: "Bicicleta devuelta; viaje finalizado",
        data: toTrip(completedTrip),
        puntuacion: score,
        suspendidoHasta: suspensionUntil,
        bloqueado: blocked,
      });
    } catch (error) {
      res.status(500).json({
        message: "No se pudo finalizar el viaje",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  history = async (req: Request, res: Response): Promise<void> => {
    const userId = req.authUser?.id;
    if (!userId) {
      res.status(401).json({ message: "Debes iniciar sesión" });
      return;
    }
    try {
      const documents = await this.db
        .collection<TripDocument>("viajes")
        .find({ usuarioId: userId })
        .sort({ fechaInicio: -1 })
        .toArray();
      res.status(200).json(documents.map(toTrip));
    } catch (error) {
      res.status(500).json({
        message: "No se pudo consultar el historial de viajes",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
}
