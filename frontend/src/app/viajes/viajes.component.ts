import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Bicicleta, BicicletaService } from '../shared/services/bicicleta.service';
import { Estacion, EstacionService } from '../shared/services/estacion.service';
import { Viaje, ViajeService } from '../shared/services/viaje.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-viajes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './viajes.component.html',
  styleUrl: './viajes.component.css'
})
export class ViajesComponent implements OnInit {
  historial: Viaje[] = [];
  viajeActivo: Viaje | null = null;
  estaciones: Estacion[] = [];
  bicicletas: Bicicleta[] = [];
  cargando = true;
  error = '';

  constructor(
    private readonly viajeService: ViajeService,
    private readonly estacionService: EstacionService,
    private readonly bicicletaService: BicicletaService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.estacionService.getAll().subscribe({
      next: data => { this.estaciones = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
    this.bicicletaService.getAll().subscribe({
      next: data => { this.bicicletas = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
    this.cargarViajes();
  }

  nombreEstacion(id: string | null): string {
    if (!id) return 'Pendiente';
    return this.estaciones.find(estacion => estacion.id === id)?.nombre ?? id;
  }

  codigoBicicleta(id: string): string {
    return this.bicicletas.find(bicicleta => bicicleta.id === id)?.codigo ?? id;
  }

  private cargarViajes(): void {
    this.cargando = true;
    this.viajeService.getHistory().subscribe({
      next: data => {
        this.historial = data;
        this.viajeActivo = data.find(viaje => viaje.fecha_fin === null) ?? null;
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error);
      }
    });
  }

  private mostrarError(error: { error?: { message?: string } }): void {
    this.error = error.error?.message ?? 'No se pudieron cargar los viajes';
        this.cdr.markForCheck();
      }
}
