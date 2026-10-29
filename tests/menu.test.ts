import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("TypeScript CLI menu starts and exits through its menu option", () => {
  const result = spawnSync(
    process.execPath,
    ["-r", "ts-node/register", "src/cli/index.ts"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      input: "3\n",
      timeout: 20_000,
    }
  );

  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SISTEMA DE ALQUILER DE BICICLETAS/);
  assert.match(result.stdout, /¡Hasta luego!/);
});
