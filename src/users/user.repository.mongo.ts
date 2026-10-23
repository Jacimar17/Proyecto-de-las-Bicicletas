import { Collection, Db, Document, ObjectId } from "mongodb";
import { User } from "./user.model";

export interface UserDocument extends Document, Omit<User, "id"> {
  _id: ObjectId;
}

export class UserRepositoryMongo {
  private readonly collection: Collection<UserDocument>;

  constructor(db: Db) {
    this.collection = db.collection<UserDocument>("users");
  }

  findAll(): Promise<UserDocument[]> {
    return this.collection.find().sort({ createdAt: -1 }).toArray();
  }

  findById(id: string): Promise<UserDocument | null> {
    if (!ObjectId.isValid(id)) return Promise.resolve(null);
    return this.collection.findOne({ _id: new ObjectId(id) });
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.collection.findOne({ email: email.toLowerCase() });
  }

  findByDni(dni: string): Promise<UserDocument | null> {
    return this.collection.findOne({ dni });
  }

  findByName(name: string): Promise<UserDocument | null> {
    return this.collection.findOne({ name });
  }

  async create(user: Omit<User, "id">): Promise<UserDocument> {
    const now = new Date();
    const document: UserDocument = {
      ...user,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    await this.collection.insertOne(document);
    return document;
  }

  async update(id: string, user: Partial<Omit<User, "id">>): Promise<UserDocument | null> {
    if (!ObjectId.isValid(id)) return null;
    return this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...user, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }
}
