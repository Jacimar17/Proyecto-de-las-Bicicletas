import { Db, MongoClient } from "mongodb";

export interface DatabaseConnection {
  client: MongoClient;
  db: Db;
}

export async function connectDB(): Promise<DatabaseConnection> {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI must be configured to connect to MongoDB Atlas.");
  }

  const client = new MongoClient(uri);
  await client.connect();

  const dbName = process.env.MONGO_DB_NAME || "bicicletas_db";
  return { client, db: client.db(dbName) };
}
