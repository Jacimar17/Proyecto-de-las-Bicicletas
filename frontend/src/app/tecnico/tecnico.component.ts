import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Bicicleta, BicicletaService } from '../shared/services/bicicleta.service';
import { EstadoMantenimiento, Mantenimiento, MantenimientoService } from '../shared/services/mantenimiento.service';
import { NotificationService } from '../shared/notification.service';

@Component({
  selector: 'app-tecnico',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tecnico.component.html',
  styleUrl: './tecnico.component.css'
})
export class TecnicoComponent implements OnInit {
  bicicletas: Bicicleta[] = [];
  mantenimientos: Mantenimiento[] = [];

  constructor(
    private readonly bicicletaService: BicicletaService,
    private readonly mantenimientoService: MantenimientoService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.mantenimientoService.getAll().subscribe({
      next: data => { this.mantenimientos = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  actualizar(bicicleta: Bicicleta, estado: EstadoMantenimiento): void {
    if (!bicicleta.id) return;
    this.mantenimientoService.actualizarEstado(bicicleta.id, estado).subscribe({
      next: () => {
        this.notifications.success(`Estado actualizado para ${bicicleta.codigo}`);
        this.cdr.markForCheck();
        this.cargar();
        this.mantenimientoService.getAll().subscribe({
          next: data => { this.mantenimientos = data; this.cdr.markForCheck(); },
          error: error => this.mostrarError(error)
        });
      },
      error: error => this.mostrarError(error)
    });
  }

  private cargar(): void {
    this.bicicletaService.getAll().subscribe({
      next: data => { this.bicicletas = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  private mostrarError(error: { status?: number; error?: { message?: string } }): void {
    this.notifications.httpError(error);
    this.cdr.markForCheck();
  }
}
