import "dotenv/config";
import { API_BASE_URL } from "./api-client";
import { runMenu } from "./menu";

console.log(`Conectando a la API en: ${API_BASE_URL}`);
console.log('Asegúrate de que el servidor esté corriendo con `npm start`.\n');

void runMenu().catch((error: unknown) => {
  console.error("Menu startup failed:", error);
  process.exitCode = 1;
});
