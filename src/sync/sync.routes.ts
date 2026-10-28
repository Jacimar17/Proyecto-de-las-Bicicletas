import { Router } from "express";
import { SyncService } from "./sync.service";

export function createSyncRoutes(sync: SyncService): Router {
  const router = Router();

  router.get("/status", async (_req, res) => {
    res.json(await sync.status());
  });

  router.post("/", async (_req, res) => {
    const result = await sync.sync();
    res.status(result.error ? 503 : 200).json(result);
  });

  return router;
}
