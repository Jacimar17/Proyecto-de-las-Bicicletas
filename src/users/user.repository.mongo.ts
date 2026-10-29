import { Collection, Db, Document, ObjectId } from "mongodb";
import { User } from "./user.entity";
import { UserRepository } from "./user.repository.interface";
import { COLLECTIONS } from "../config/collections";

export interface UserDocument extends Document, Omit<User, "id"> {
  _id: ObjectId;
}

export class UserRepositoryMongo implements UserRepository {
  private readonly collection: Collection<UserDocument>;

  constructor(db: Db) {
    this.collection = db.collection<UserDocument>(COLLECTIONS.users);
  }

  async findAll(): Promise<User[]> {
    const documents = await this.collection.find().sort({ createdAt: -1 }).toArray();
    return documents.map((document) => this.toEntity(document));
  }

  async findById(id: string): Promise<User | null> {
    if (!ObjectId.isValid(id)) return null;
    const document = await this.collection.findOne({ _id: new ObjectId(id) });
    return document ? this.toEntity(document) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const document = await this.collection.findOne({ email: email.toLowerCase() });
    return document ? this.toEntity(document) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const document = await this.collection.findOne({ googleId });
    return document ? this.toEntity(document) : null;
  }

  async findByDni(dni: string): Promise<User | null> {
    const document = await this.collection.findOne({ dni });
    return document ? this.toEntity(document) : null;
  }

  async findByName(name: string): Promise<User | null> {
    const document = await this.collection.findOne({ name });
    return document ? this.toEntity(document) : null;
  }

  async create(user: Omit<User, "id">): Promise<User> {
    const now = new Date();
    const document: UserDocument = {
      ...user,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.collection.insertOne(document);
    return this.toEntity({ ...document, _id: result.insertedId });
  }

  async update(id: string, user: Partial<Omit<User, "id">>): Promise<User | null> {
    if (!ObjectId.isValid(id)) return null;
    const document = await this.collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...user, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return document ? this.toEntity(document) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const result = await this.collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount === 1;
  }

  private toEntity(document: UserDocument): User {
    const { _id, ...user } = document;
    return { ...user, id: _id.toString() };
  }
}
