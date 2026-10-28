import "dotenv/config";
import { Server } from "node:http";
import { createApp, ensureApplicationIndexes } from "./src/app";
import { connectAtlas, connectDB, getMongoDbName } from "./src/config/db";
import { SyncService, trackWrites } from "./src/sync/sync.service";

async function startServer(): Promise<void> {
  const { client, db: rawDb } = await connectDB();
  const atlasClient = await connectAtlas();
  const sync = new SyncService(rawDb, atlasClient, getMongoDbName());
  const db = atlasClient ? trackWrites(rawDb) : rawDb;
  await ensureApplicationIndexes(db);
  const app = createApp(db, sync);
  const port = Number(process.env.PORT || 3000);
  const server: Server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  sync.start(Number(process.env.SYNC_INTERVAL_MS || 30000));

  const shutdown = (): void => {
    sync.stop();
    server.close(() => {
      void Promise.all([client.close(), atlasClient?.close()]).then(() => process.exit(0));
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});
