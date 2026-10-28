import { Collection, Db, Document, ObjectId } from "mongodb";
import { Bicycle, BicycleStatus } from "./bicycle.model";
import { COLLECTIONS } from "../config/collections";
import { mirrorBicycleFields } from "./bicycle-fields";

export interface BicycleDocument extends Document {
  code: string;
  currentStation: string;
  status: BicycleStatus;
  unlockCode: string;
  rentedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BicycleRepositoryMongo {
  private readonly collection: Collection<BicycleDocument>;

  constructor(db: Db) {
    this.collection = db.collection<BicycleDocument>(COLLECTIONS.bicycles);
  }

  getCollection(): Collection<BicycleDocument> {
    return this.collection;
  }

  async findAll(): Promise<Bicycle[]> {
    const documents = await this.collection.find().toArray();
    return documents.map((document) => this.toBicycle(document));
  }

  async findById(id: string): Promise<Bicycle | null> {
    if (!ObjectId.isValid(id)) return null;
    const document = await this.collection.findOne({ _id: new ObjectId(id) });
    return document ? this.toBicycle(document) : null;
  }

  async create(data: Omit<Bicycle, "_id">): Promise<Bicycle> {
    const now = new Date();
    const document: BicycleDocument = { ...mirrorBicycleFields(data), createdAt: now, updatedAt: now };
    const result = await this.collection.insertOne(document);
    return { ...document, _id: result.insertedId.toString() };
  }

  async update(id: string, data: Partial<Bicycle>): Promise<Bicycle | null> {
    if (!ObjectId.isValid(id)) return null;
    const document = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...mirrorBicycleFields(data), updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return document ? this.toBicycle(document) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  private toBicycle(document: BicycleDocument): Bicycle {
    return {
      _id: document._id?.toString(),
      code: document.code,
      currentStation: document.currentStation,
      status: document.status,
      unlockCode: document.unlockCode,
      rentedBy: document.rentedBy,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
