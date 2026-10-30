import type { ApiData, ApiResult } from "./types";

export const API_BASE_URL = (
  process.env.API_BASE_URL || 'http://localhost:3000'
).replace(/\/+$/, '');

export class ApiClient {
  constructor(private readonly getToken: () => string | null) {}

  async request(
    path: string,
    method = 'GET',
    body: Record<string, unknown> | null = null,
    extraHeaders: Record<string, string> = {}
  ): Promise<ApiResult> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...extraHeaders,
    };
    const token = this.getToken();

    if (token) headers.Authorization = `Bearer ${token}`;

    const options: RequestInit = { method, headers };
    if (body) options.body = JSON.stringify(body);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, options);
      if (response.status === 204) {
        return { status: response.status, data: {} };
      }
      const data = (await response.json()) as ApiData;
      return { status: response.status, data };
    } catch (error: unknown) {
      const detail = error instanceof Error ? ` (${error.message})` : '';
      return {
        status: 0,
        data: {
          error: `No se pudo conectar con el servidor en ${API_BASE_URL}.${detail} ¿Está corriendo \`npm start\`?`,
        },
      };
    }
  }
}
