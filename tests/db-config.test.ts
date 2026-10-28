import assert from "node:assert/strict";
import { test } from "node:test";
import { getAtlasUri, getLocalMongoUri, getMongoUri } from "../src/config/db";

test("hybrid config: LOCAL_MONGO_URI wins, Atlas is optional", () => {
  assert.equal(getLocalMongoUri({ LOCAL_MONGO_URI: "mongodb://local", MONGO_URI: "mongodb://x" }), "mongodb://local");
  assert.equal(getLocalMongoUri({}), "mongodb://127.0.0.1:27017");
  assert.equal(getAtlasUri({ ATLAS_URI: " " }), undefined);
  assert.equal(getAtlasUri({ ATLAS_URI: "mongodb+srv://a" }), "mongodb+srv://a");
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
