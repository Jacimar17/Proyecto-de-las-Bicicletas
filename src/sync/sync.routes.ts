import { Router } from "express";
import { authenticate, requireAdmin } from "../auth/auth.middleware";
import { SyncService } from "./sync.service";

export function createSyncRoutes(sync: SyncService): Router {
  const router = Router();

  router.get("/status", authenticate, requireAdmin, async (_req, res) => {
    res.json(await sync.status());
  });

  router.post("/", authenticate, requireAdmin, async (_req, res) => {
    const result = await sync.sync();
    res.status(result.error ? 503 : 200).json(result);
  });

  return router;
}
