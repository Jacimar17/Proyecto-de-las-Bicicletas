import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Bicicleta, BicicletaService } from '../shared/services/bicicleta.service';
import { EstadoMantenimiento, Mantenimiento, MantenimientoService } from '../shared/services/mantenimiento.service';

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
  error = '';
  mensaje = '';

  constructor(
    private readonly bicicletaService: BicicletaService,
    private readonly mantenimientoService: MantenimientoService,
    private readonly cdr: ChangeDetectorRef
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
    this.error = '';
    this.mensaje = '';
    this.mantenimientoService.actualizarEstado(bicicleta.id, estado).subscribe({
      next: () => {
        this.mensaje = `Estado actualizado para ${bicicleta.codigo}`;
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

  private mostrarError(error: { error?: { message?: string } }): void {
    this.error = error.error?.message ?? 'No se pudo completar la operación';
    this.mensaje = '';
        this.cdr.markForCheck();
      }
}
