import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";
import { ApiClient } from "../src/cli/api-client";

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
  assert.match(result.stdout, /SISTEMA DE BICICLETAS COMPARTIDAS DE VENADO TUERTO/);
  assert.match(result.stdout, /¡Hasta luego!/);
});

test("CLI API client accepts successful 204 responses without a body", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 204 });

  try {
    const client = new ApiClient(() => "admin-token");
    const result = await client.request("/api/users/user-1", "DELETE");
    assert.deepEqual(result, { status: 204, data: {} });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("admin CLI shows the user occupying each bicycle in use", { timeout: 20_000 }, async () => {
  const server = createServer((request, response) => {
    const path = new URL(request.url ?? "/", `http://${request.headers.host}`).pathname;
    const dataByPath: Record<string, unknown> = {
      "/api/users/login": {
        token: "admin-token",
        role: "admin",
        user: { email: "admin@example.com", nombre: "Admin", role: "admin" },
      },
      "/api/bicycles": [
        { id: "bike-1", codigo: "BIC-1", modelo: "Urbana", ubicacion: "Centro", estado: "EN_USO" },
        { id: "bike-2", codigo: "BIC-2", modelo: "Ruta", ubicacion: "Centro", estado: "DISPONIBLE" },
      ],
      "/api/trips/all": [
        {
          id: "trip-1",
          usuario_id: "user-1",
          bicicleta_id: "bike-1",
          estacion_origen_id: "station-1",
          estacion_destino_id: null,
          fecha_inicio: new Date().toISOString(),
          fecha_fin: null,
        },
      ],
      "/api/users": [
        { id: "user-1", nombre: "Ana", apellido: "Gómez", email: "ana@example.com" },
      ],
    };
    const payload = dataByPath[path];
    response.writeHead(payload === undefined ? 404 : 200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(payload ?? { message: "Not found" }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const result = await new Promise<{ status: number | null; stdout: string; stderr: string }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["-r", "ts-node/register", "src/cli/index.ts"],
        {
          cwd: process.cwd(),
          env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${address.port}` },
          stdio: ["pipe", "pipe", "pipe"],
        }
      );
      let stdout = "";
      let stderr = "";
      const responses: Array<[string, string]> = [
        ["Selecciona una opción: ", "1"],
        ["Email: ", "admin@example.com"],
        ["Contraseña: ", "pass"],
        ["Selecciona una opción: ", "1"],
        ["Selecciona una opción: ", "7"],
      ];
      let nextResponse = 0;
      let searchFrom = 0;
      child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
        stdout += chunk;
        while (nextResponse < responses.length) {
          const [prompt, answer] = responses[nextResponse];
          const promptIndex = stdout.indexOf(prompt, searchFrom);
          if (promptIndex < 0) break;
          searchFrom = promptIndex + prompt.length;
          nextResponse++;
          child.stdin.write(`${answer}\n`);
        }
      });
      child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk; });
      child.on("error", reject);
      child.on("close", (status) => resolve({ status, stdout, stderr }));
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usuario ocupante: Ana Gómez \(ana@example\.com\)/);
    assert.match(result.stdout, /Código: BIC-2[\s\S]*Estado: DISPONIBLE/);
    assert.equal((result.stdout.match(/Usuario ocupante:/g) ?? []).length, 1);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
