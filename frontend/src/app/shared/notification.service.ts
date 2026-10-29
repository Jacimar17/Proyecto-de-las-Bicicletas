import { Injectable } from '@angular/core';

export type NotificationKind = 'success' | 'error' | 'confirm';

export interface NotificationState {
  kind: NotificationKind;
  title: string;
  message: string;
  detail?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  current: NotificationState | null = null;
  private resolver: ((accepted: boolean) => void) | null = null;

  success(message: string, title = 'Listo', detail?: string): void {
    this.open({ kind: 'success', title, message, detail });
  }

  error(message: string, title = 'Ocurrió un problema'): void {
    this.open({ kind: 'error', title, message });
  }

  httpError(error: { status?: number; error?: { message?: string } | string }, fallback = 'No se pudo completar la operación'): void {
    const body = error?.error;
    const serverMessage = typeof body === 'object' && body ? body.message : undefined;
    if (serverMessage) return this.error(serverMessage);
    if (error?.status === 0) {
      return this.error('No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.');
    }
    this.error(fallback);
  }

  confirm(message: string, title = 'Confirmar acción'): Promise<boolean> {
    return new Promise(resolve => this.open({ kind: 'confirm', title, message }, resolve));
  }

  close(accepted = true): void {
    const resolver = this.resolver;
    this.resolver = null;
    this.current = null;
    resolver?.(accepted);
  }

  private open(state: NotificationState, resolver: ((accepted: boolean) => void) | null = null): void {
    this.resolver?.(false);
    this.resolver = resolver;
    this.current = state;
  }
}
