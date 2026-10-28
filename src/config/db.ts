import { Db, MongoClient } from "mongodb";

export const DEFAULT_DB_NAME = "bicicletas";

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

export function getLocalMongoUri(
  env: Partial<Pick<NodeJS.ProcessEnv, "LOCAL_MONGO_URI" | "MONGO_URI" | "DATABASE_URL">> = process.env
): string {
  return env.LOCAL_MONGO_URI?.trim() || getMongoUri(env);
}

export function getAtlasUri(env: Partial<Pick<NodeJS.ProcessEnv, "ATLAS_URI">> = process.env): string | undefined {
  return env.ATLAS_URI?.trim() || undefined;
}

export function getMongoDbName(
  env: Partial<Pick<NodeJS.ProcessEnv, "MONGO_DB_NAME">> = process.env
): string {
  return env.MONGO_DB_NAME?.trim() || DEFAULT_DB_NAME;
}

export async function connectDB(): Promise<DatabaseConnection> {
  const client = new MongoClient(getLocalMongoUri());
  await client.connect();

  return { client, db: client.db(getMongoDbName()) };
}

/** Optional Atlas client; returns undefined when not configured or unreachable. */
export async function connectAtlas(): Promise<MongoClient | undefined> {
  const uri = getAtlasUri();
  if (!uri) return undefined;
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
  } catch (error) {
    console.warn("Atlas unreachable, running local-only:", (error as Error).message);
  }
  return client;
}
