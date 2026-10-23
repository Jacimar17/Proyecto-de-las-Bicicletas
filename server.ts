import "dotenv/config";
import { Server } from "node:http";
import { createApp } from "./src/app";
import { connectDB } from "./src/config/db";

async function startServer(): Promise<void> {
  const { client, db } = await connectDB();
  const app = createApp(db);
  const port = Number(process.env.PORT || 3000);
  const server: Server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      void client.close().then(() => process.exit(0));
    });
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error: unknown) => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});
