import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAtlasUri,
  getLocalMongoUri,
  getMongoConnectionUri,
  getMongoDbName,
  getMongoMode,
  getMongoUri,
} from "../src/config/db";

test("MongoDB database name defaults to bicicletas and accepts an override", () => {
  assert.equal(getMongoDbName({}), "bicicletas");
  assert.equal(getMongoDbName({ MONGO_DB_NAME: "bicicletas_db" }), "bicicletas_db");
  assert.equal(getMongoDbName({ MONGO_DB_NAME: " " }), "bicicletas");
});

test("hybrid config: LOCAL_MONGO_URI wins, Atlas is optional", () => {
  assert.equal(getLocalMongoUri({ LOCAL_MONGO_URI: "mongodb://local", MONGO_URI: "mongodb://x" }), "mongodb://local");
  assert.equal(getLocalMongoUri({}), "mongodb://127.0.0.1:27017");
  assert.equal(getAtlasUri({ ATLAS_URI: " " }), undefined);
  assert.equal(getAtlasUri({ ATLAS_URI: "mongodb+srv://a" }), "mongodb+srv://a");
});

test("MongoDB mode defaults to local and validates explicit modes", () => {
  assert.equal(getMongoMode({}), "local");
  assert.equal(getMongoMode({ MONGO_MODE: " ATLAS " }), "atlas");
  assert.throws(() => getMongoMode({ MONGO_MODE: "remote" }), /Expected "local" or "atlas"/);
});

test("Atlas mode requires and uses ATLAS_URI without a local URI", () => {
  assert.equal(
    getMongoConnectionUri("atlas", { ATLAS_URI: "mongodb+srv://atlas.example" }),
    "mongodb+srv://atlas.example"
  );
  assert.throws(() => getMongoConnectionUri("atlas", {}), /ATLAS_URI is required/);
});

test("local mode continues to use the local URI configuration", () => {
  assert.equal(
    getMongoConnectionUri("local", { LOCAL_MONGO_URI: "mongodb://local" }),
    "mongodb://local"
  );
  assert.equal(getMongoConnectionUri("local", {}), "mongodb://127.0.0.1:27017");
});

test("MongoDB connection prefers MONGO_URI over DATABASE_URL", () => {
  assert.equal(
    getMongoUri({
      MONGO_URI: "mongodb+srv://atlas.example",
      DATABASE_URL: "mongodb://database-url.example",
    }),
    "mongodb+srv://atlas.example"
  );
});

test("MongoDB connection accepts DATABASE_URL when MONGO_URI is unset", () => {
  assert.equal(
    getMongoUri({ MONGO_URI: undefined, DATABASE_URL: "mongodb+srv://atlas.example" }),
    "mongodb+srv://atlas.example"
  );
});

test("MongoDB connection falls back to localhost when no URI is configured", () => {
  assert.equal(
    getMongoUri({ MONGO_URI: "  ", DATABASE_URL: undefined }),
    "mongodb://127.0.0.1:27017"
  );
});
