import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Bicicleta, BicicletaService } from '../shared/services/bicicleta.service';
import { Estacion, EstacionService } from '../shared/services/estacion.service';
import { Mantenimiento, MantenimientoService, TareaRealizada } from '../shared/services/mantenimiento.service';
import { TareaMantenimiento, TareaMantenimientoService, ZONAS, ZonaBicicleta, etiquetaZona } from '../shared/services/tarea-mantenimiento.service';
import { NotificationService } from '../shared/notification.service';

@Component({
  selector: 'app-tecnico',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tecnico.component.html',
  styleUrl: './tecnico.component.css'
})
export class TecnicoComponent implements OnInit {
  readonly zonas = ZONAS;
  readonly etiquetaZona = etiquetaZona;

  estaciones: Estacion[] = [];
  bicicletas: Bicicleta[] = [];
  catalogo: TareaMantenimiento[] = [];
  mantenimientos: Mantenimiento[] = [];

  estacionId = '';
  bicicletaId = '';
  enTaller: Bicicleta | null = null;
  zonaActiva: ZonaBicicleta | null = null;
  tareasElegidas: TareaRealizada[] = [];
  procesando = false;

  constructor(
    private readonly bicicletaService: BicicletaService,
    private readonly estacionService: EstacionService,
    private readonly mantenimientoService: MantenimientoService,
    private readonly tareaService: TareaMantenimientoService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarBicicletas();
    this.cargarHistorial();
    this.estacionService.getAll().subscribe({
      next: data => { this.estaciones = data.filter(estacion => estacion.activa); this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
    this.tareaService.getAll().subscribe({
      next: data => { this.catalogo = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  get bicicletasEstacion(): Bicicleta[] {
    return this.bicicletas
      .filter(bicicleta => bicicleta.estacion_id === this.estacionId
        && (bicicleta.estado === 'DISPONIBLE' || bicicleta.estado === 'EN_MANTENIMIENTO'))
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
  }

  get tareasZona(): TareaMantenimiento[] {
    return this.catalogo.filter(tarea => tarea.zona === this.zonaActiva);
  }

  get nombreEstacion(): string {
    return this.estaciones.find(estacion => estacion.id === this.estacionId)?.nombre ?? '';
  }

  cambiarEstacion(): void {
    this.bicicletaId = '';
  }

  iniciarMantenimiento(): void {
    const bicicleta = this.bicicletas.find(item => item.id === this.bicicletaId);
    if (!bicicleta?.id || !this.estacionId) return;
    const id = bicicleta.id;
    void this.notifications.confirmarCambio(
      `Vas a retirar la bicicleta ${bicicleta.codigo} de la estación ${this.nombreEstacion} para mantenimiento`
    ).then(ok => {
      if (!ok) return;
      if (bicicleta.estado === 'EN_MANTENIMIENTO') {
        this.comenzarSesion(bicicleta);
        return;
      }
      this.procesando = true;
      this.mantenimientoService.actualizarEstado(id, 'EN_MANTENIMIENTO', { estacion_id: this.estacionId }).subscribe({
        next: () => {
          this.procesando = false;
          this.comenzarSesion({ ...bicicleta, estado: 'EN_MANTENIMIENTO' });
          this.cargarBicicletas();
          this.cargarHistorial();
        },
        error: error => { this.procesando = false; this.mostrarError(error); }
      });
    });
  }

  seleccionarZona(zona: ZonaBicicleta): void {
    this.zonaActiva = zona;
  }

  tareaElegida(zona: string, nombre: string): boolean {
    return this.tareasElegidas.some(item => item.zona === zona && item.tarea === nombre);
  }

  alternarTarea(tarea: TareaMantenimiento): void {
    if (this.tareaElegida(tarea.zona, tarea.nombre)) {
      this.tareasElegidas = this.tareasElegidas.filter(item => !(item.zona === tarea.zona && item.tarea === tarea.nombre));
    } else {
      this.tareasElegidas = [...this.tareasElegidas, { zona: tarea.zona, tarea: tarea.nombre }];
    }
  }

  cantidadZona(zona: string): number {
    return this.tareasElegidas.filter(item => item.zona === zona).length;
  }

  finalizar(): void {
    const bicicleta = this.enTaller;
    if (!bicicleta?.id) return;
    const id = bicicleta.id;
    const resumen = this.tareasElegidas.length
      ? `${this.tareasElegidas.length} tarea(s) realizadas`
      : 'sin tareas registradas';
    void this.notifications.confirmarCambio(
      `Vas a devolver la bicicleta ${bicicleta.codigo} a la estación ${this.nombreEstacion} como disponible (${resumen})`
    ).then(ok => {
      if (!ok) return;
      this.procesando = true;
      this.mantenimientoService.actualizarEstado(id, 'DISPONIBLE', {
        estacion_id: this.estacionId,
        tareas: this.tareasElegidas
      }).subscribe({
        next: () => {
          this.procesando = false;
          this.notifications.success(`${bicicleta.codigo} quedó disponible en ${this.nombreEstacion}`);
          this.cancelarSesion();
          this.cargarBicicletas();
          this.cargarHistorial();
        },
        error: error => { this.procesando = false; this.mostrarError(error); }
      });
    });
  }

  cancelarSesion(): void {
    this.enTaller = null;
    this.zonaActiva = null;
    this.tareasElegidas = [];
    this.bicicletaId = '';
    this.cdr.markForCheck();
  }

  codigoBicicleta(id: string): string {
    return this.bicicletas.find(bicicleta => bicicleta.id === id)?.codigo ?? id;
  }

  private comenzarSesion(bicicleta: Bicicleta): void {
    this.enTaller = bicicleta;
    this.zonaActiva = null;
    this.tareasElegidas = [];
    this.cdr.markForCheck();
  }

  private cargarBicicletas(): void {
    this.bicicletaService.getAll().subscribe({
      next: data => { this.bicicletas = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  private cargarHistorial(): void {
    this.mantenimientoService.getAll().subscribe({
      next: data => { this.mantenimientos = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  private mostrarError(error: { status?: number; error?: { message?: string } }): void {
    this.notifications.httpError(error);
    this.cdr.markForCheck();
  }
}
