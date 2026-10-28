import { Collection, Db, Document, MongoClient } from "mongodb";

const DIRTY = "_sync_dirty";
const META = "_sync_meta";

const WRITE_METHODS = new Set([
  "insertOne", "insertMany", "updateOne", "updateMany", "replaceOne",
  "deleteOne", "deleteMany", "findOneAndUpdate", "findOneAndDelete",
  "findOneAndReplace", "bulkWrite", "drop",
]);

export interface SyncStatus {
  atlasConfigured: boolean;
  online: boolean;
  pendingCollections: string[];
  lastPushAt: string | null;
  lastPullAt: string | null;
  lastError: string | null;
}

export interface SyncSummary {
  collections: Record<string, number>;
  skipped: string[];
}

function isInternal(name: string): boolean {
  return name === DIRTY || name === META || name.startsWith("system.");
}

/** Wraps a Db so every successful write marks its collection as pending sync. */
export function trackWrites(db: Db): Db {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop !== "collection") {
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      }
      return (name: string, ...rest: unknown[]) => {
        const col = (target.collection as (...a: unknown[]) => Collection)(name, ...rest);
        if (isInternal(name)) return col;
        return new Proxy(col, {
          get(c, method) {
            const value = Reflect.get(c, method, c);
            if (typeof method !== "string" || !WRITE_METHODS.has(method)) {
              return typeof value === "function" ? value.bind(c) : value;
            }
            return async (...args: unknown[]) => {
              const result = await (value as (...a: unknown[]) => Promise<unknown>).apply(c, args);
              await target
                .collection(DIRTY)
                .updateOne({ _id: name as never }, { $set: { ts: new Date() } }, { upsert: true });
              return result;
            };
          },
        });
      };
    },
  });
}

export class SyncService {
  private lastError: string | null = null;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly local: Db,
    private readonly atlasClient?: MongoClient,
    private readonly atlasDbName = "bicicletas_db"
  ) {}

  private get atlas(): Db | undefined {
    return this.atlasClient?.db(this.atlasDbName);
  }

  private async setMeta(key: string, value: Date): Promise<void> {
    await this.local.collection(META).updateOne({ _id: key as never }, { $set: { value } }, { upsert: true });
  }

  private async getMeta(key: string): Promise<string | null> {
    const doc = await this.local.collection(META).findOne({ _id: key as never });
    return doc?.value ? new Date(doc.value).toISOString() : null;
  }

  private async pending(): Promise<string[]> {
    const docs = await this.local.collection(DIRTY).find().toArray();
    return docs.map((d) => String(d._id));
  }

  async status(): Promise<SyncStatus> {
    let online = false;
    if (this.atlas) {
      try {
        await this.atlas.command({ ping: 1 });
        online = true;
      } catch {
        online = false;
      }
    }
    return {
      atlasConfigured: Boolean(this.atlas),
      online,
      pendingCollections: await this.pending(),
      lastPushAt: await this.getMeta("lastPush"),
      lastPullAt: await this.getMeta("lastPull"),
      lastError: this.lastError,
    };
  }

  private async mirror(source: Db, target: Db, name: string): Promise<number> {
    const docs: Document[] = await source.collection(name).find().toArray();
    const col = target.collection(name);
    if (docs.length === 0) {
      await col.deleteMany({});
    } else {
      await col.bulkWrite(
        docs.map((d) => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
        { ordered: false }
      );
      await col.deleteMany({ _id: { $nin: docs.map((d) => d._id) } });
    }
    return docs.length;
  }

  /** Mirrors locally modified collections into Atlas. */
  async push(): Promise<SyncSummary> {
    const atlas = this.requireAtlas();
    const summary: SyncSummary = { collections: {}, skipped: [] };
    for (const name of await this.pending()) {
      summary.collections[name] = await this.mirror(this.local, atlas, name);
      await this.local.collection(DIRTY).deleteOne({ _id: name as never });
    }
    await this.setMeta("lastPush", new Date());
    return summary;
  }

  /** Downloads Atlas data into local, skipping collections with unpushed local changes. */
  async pull(): Promise<SyncSummary> {
    const atlas = this.requireAtlas();
    const dirty = new Set(await this.pending());
    const summary: SyncSummary = { collections: {}, skipped: [] };
    const infos = await atlas.listCollections({}, { nameOnly: true }).toArray();
    for (const { name } of infos) {
      if (isInternal(name)) continue;
      if (dirty.has(name)) {
        summary.skipped.push(name);
        continue;
      }
      summary.collections[name] = await this.mirror(atlas, this.local, name);
    }
    await this.setMeta("lastPull", new Date());
    return summary;
  }

  /** Push local changes first, then pull everything else. Never throws. */
  async sync(): Promise<{ push?: SyncSummary; pull?: SyncSummary; error?: string }> {
    if (!this.atlas) return { error: "Atlas not configured" };
    if (this.running) return { error: "sync in progress" };
    this.running = true;
    try {
      const push = await this.push();
      const pull = await this.pull();
      this.lastError = null;
      return { push, pull };
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      return { error: this.lastError };
    } finally {
      this.running = false;
    }
  }

  start(intervalMs: number): void {
    if (!this.atlas) return;
    void this.sync();
    this.timer = setInterval(() => void this.sync(), intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private requireAtlas(): Db {
    if (!this.atlas) throw new Error("Atlas not configured");
    return this.atlas;
  }
}
