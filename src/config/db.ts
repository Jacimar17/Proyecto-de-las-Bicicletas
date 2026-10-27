import { Db, MongoClient } from "mongodb";

export interface DatabaseConnection {
  client: MongoClient;
  db: Db;
}

export function getMongoUri(
  env: Partial<Pick<NodeJS.ProcessEnv, "MONGO_URI" | "DATABASE_URL">> = process.env
): string {
  return (
    env.MONGO_URI?.trim() ||
    env.DATABASE_URL?.trim() ||
    "mongodb://127.0.0.1:27017"
  );
}

export async function connectDB(): Promise<DatabaseConnection> {
  const uri = getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();

  const dbName = process.env.MONGO_DB_NAME || "bicicletas_db";
  return { client, db: client.db(dbName) };
}
