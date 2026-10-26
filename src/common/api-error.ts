export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function errorStatus(error: unknown): number {
    return error instanceof ApiError ? error.status : 500;
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Error interno del servidor';
}
