import { AfterViewChecked, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-backdrop" *ngIf="notifications.current as n" (click)="cancelar()">
      <section
        class="modal-card"
        [class.is-success]="n.kind === 'success'"
        [class.is-error]="n.kind === 'error'"
        [class.is-confirm]="n.kind === 'confirm'"
        [attr.role]="n.kind === 'error' ? 'alertdialog' : 'dialog'"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-message"
        (click)="$event.stopPropagation()"
      >
        <div class="modal-icon" aria-hidden="true">{{ n.kind === 'success' ? '✓' : n.kind === 'error' ? '!' : '?' }}</div>
        <h2 id="modal-title">{{ n.title }}</h2>
        <p id="modal-message">{{ n.message }}</p>
        <p class="modal-detail" *ngIf="n.detail">{{ n.detail }}</p>
        <div class="modal-actions">
          <button type="button" class="modal-secondary" *ngIf="n.kind === 'confirm'" (click)="notifications.close(false)">Cancelar</button>
          <button #primary type="button" class="modal-primary" (click)="notifications.close(true)">Aceptar</button>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgb(20 40 28 / 55%);
      overflow-y: auto;
    }
    .modal-card {
      width: min(100%, 420px);
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 28px 24px 22px;
      border-radius: 18px;
      background: #fff;
      text-align: center;
      box-shadow: 0 24px 60px rgb(0 0 0 / 28%);
      border-top: 6px solid var(--green);
    }
    .modal-card.is-error { border-top-color: var(--danger); }
    .modal-card.is-confirm { border-top-color: var(--warning); }
    .modal-icon {
      display: grid;
      place-items: center;
      width: 52px;
      height: 52px;
      margin: 0 auto 12px;
      border-radius: 50%;
      background: var(--green-soft);
      color: var(--green-dark);
      font-size: 26px;
      font-weight: 700;
    }
    .is-error .modal-icon { background: var(--danger-soft); color: var(--danger); }
    .is-confirm .modal-icon { background: var(--warning-soft); color: var(--warning); }
    h2 { margin: 0 0 8px; font-size: 20px; color: var(--ink); }
    p { margin: 0; color: var(--ink); line-height: 1.5; overflow-wrap: anywhere; }
    .modal-detail { margin-top: 8px; color: var(--muted); font-size: 13px; }
    .modal-actions { display: flex; gap: 10px; justify-content: center; margin-top: 22px; }
    .modal-actions button {
      min-width: 120px;
      min-height: 44px;
      padding: 0 22px;
      border-radius: 999px;
      font-weight: 600;
      cursor: pointer;
    }
    .modal-primary { border: 0; background: var(--green-dark); color: #fff; }
    .modal-primary:hover { background: var(--green); }
    .modal-secondary { border: 1px solid var(--line); background: #fff; color: var(--ink); }
    @media (max-width: 480px) {
      .modal-card { padding: 24px 18px 18px; }
      .modal-actions { flex-direction: column-reverse; }
      .modal-actions button { width: 100%; }
    }
  `]
})
export class NotificationModalComponent implements AfterViewChecked {
  @ViewChild('primary') private primary?: ElementRef<HTMLButtonElement>;
  private focused = false;

  constructor(readonly notifications: NotificationService) {}

  ngAfterViewChecked(): void {
    if (this.primary && !this.focused) {
      this.focused = true;
      this.primary.nativeElement.focus();
    } else if (!this.primary) {
      this.focused = false;
    }
  }

  cancelar(): void {
    this.notifications.close(this.notifications.current?.kind !== 'confirm');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.notifications.current) this.cancelar();
  }
}
