import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Bicicleta, BicicletaService } from '../shared/services/bicicleta.service';
import { Estacion, EstacionService } from '../shared/services/estacion.service';
import { Mantenimiento, MantenimientoService, TareaRealizada } from '../shared/services/mantenimiento.service';
import { TareaMantenimiento, TareaMantenimientoService, ZONAS, ZonaBicicleta, etiquetaZona } from '../shared/services/tarea-mantenimiento.service';
import { PuntoMantenimiento, PuntoMantenimientoService } from '../shared/services/punto-mantenimiento.service';
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

  puntos: PuntoMantenimiento[] = [];
  private puntosGuardados = new Map<string, { x: number; y: number }>();
  modoEdicion = false;
  agregando = false;
  zonaNueva: ZonaBicicleta = 'cadena';
  puntoSeleccionado: string | null = null;
  arrastrandoId: string | null = null;
  guardandoPuntos = false;
  private huboArrastre = false;
  @ViewChild('imagenBici') private imagenBici?: ElementRef<HTMLElement>;

  constructor(
    private readonly bicicletaService: BicicletaService,
    private readonly estacionService: EstacionService,
    private readonly mantenimientoService: MantenimientoService,
    private readonly tareaService: TareaMantenimientoService,
    private readonly puntoService: PuntoMantenimientoService,
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
    this.cargarPuntos();
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

  trackPunto(_: number, punto: PuntoMantenimiento): string {
    return punto.id;
  }

  get hayCambios(): boolean {
    return this.puntos.some(punto => this.cambiado(punto));
  }

  alternarEdicion(): void {
    if (this.modoEdicion && this.hayCambios && !confirm('Hay posiciones sin guardar. Se descartaran. Continuar?')) return;
    if (this.modoEdicion) this.descartarCambios();
    this.modoEdicion = !this.modoEdicion;
    this.agregando = false;
    this.puntoSeleccionado = null;
  }

  descartarCambios(): void {
    this.puntos = this.puntos.map(punto => ({ ...punto, ...(this.puntosGuardados.get(punto.id) ?? {}) }));
  }

  guardarPosiciones(): void {
    const cambios = this.puntos.filter(punto => this.cambiado(punto)).map(({ id, x, y }) => ({ id, x, y }));
    if (cambios.length === 0) return;
    this.guardandoPuntos = true;
    this.puntoService.updatePosiciones(cambios).subscribe({
      next: () => {
        cambios.forEach(({ id, x, y }) => this.puntosGuardados.set(id, { x, y }));
        this.guardandoPuntos = false;
        this.cdr.markForCheck();
      },
      error: error => { this.guardandoPuntos = false; this.mostrarError(error); }
    });
  }

  clickPunto(event: Event, punto: PuntoMantenimiento): void {
    event.stopPropagation();
    if (this.huboArrastre) { this.huboArrastre = false; return; }
    if (this.modoEdicion) {
      this.puntoSeleccionado = punto.id;
      this.agregando = false;
    } else {
      this.seleccionarZona(punto.zona);
    }
  }

  clickImagen(event: MouseEvent): void {
    if (!this.modoEdicion) return;
    const posicion = this.porcentajes(event);
    if (!posicion) return;
    if (this.agregando) {
      this.puntoService.create({ zona: this.zonaNueva, nombre: etiquetaZona(this.zonaNueva), ...posicion }).subscribe({
        next: creado => {
          this.puntos = [...this.puntos, creado];
          this.puntosGuardados.set(creado.id, { x: creado.x, y: creado.y });
          this.puntoSeleccionado = creado.id;
          this.agregando = false;
          this.cdr.markForCheck();
        },
        error: error => this.mostrarError(error)
      });
    } else if (this.puntoSeleccionado) {
      this.moverPunto(this.puntoSeleccionado, posicion);
    }
  }

  eliminarPunto(): void {
    const id = this.puntoSeleccionado;
    if (!id) return;
    this.puntoService.delete(id).subscribe({
      next: () => {
        this.puntos = this.puntos.filter(punto => punto.id !== id);
        this.puntosGuardados.delete(id);
        this.puntoSeleccionado = null;
        this.cdr.markForCheck();
      },
      error: error => this.mostrarError(error)
    });
  }

  iniciarArrastre(event: PointerEvent, punto: PuntoMantenimiento): void {
    if (!this.modoEdicion) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    this.arrastrandoId = punto.id;
    this.huboArrastre = false;
    this.puntoSeleccionado = punto.id;
  }

  arrastrar(event: PointerEvent, punto: PuntoMantenimiento): void {
    if (this.arrastrandoId !== punto.id) return;
    const posicion = this.porcentajes(event);
    if (!posicion) return;
    this.huboArrastre = true;
    this.moverPunto(punto.id, posicion);
  }

  terminarArrastre(event: PointerEvent): void {
    if (this.arrastrandoId === null) return;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.arrastrandoId = null;
    // Si no se dispara click tras soltar, se limpia la marca de arrastre.
    setTimeout(() => { this.huboArrastre = false; });
  }

  private cambiado(punto: PuntoMantenimiento): boolean {
    const original = this.puntosGuardados.get(punto.id);
    return !original || original.x !== punto.x || original.y !== punto.y;
  }

  private moverPunto(id: string, posicion: { x: number; y: number }): void {
    this.puntos = this.puntos.map(punto => punto.id === id ? { ...punto, ...posicion } : punto);
    this.cdr.markForCheck();
  }

  private porcentajes(event: MouseEvent | PointerEvent): { x: number; y: number } | null {
    const rect = this.imagenBici?.nativeElement.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const limitar = (valor: number) => Math.min(100, Math.max(0, Math.round(valor * 100) / 100));
    return {
      x: limitar(((event.clientX - rect.left) / rect.width) * 100),
      y: limitar(((event.clientY - rect.top) / rect.height) * 100)
    };
  }

  private cargarPuntos(): void {
    this.puntoService.getAll().subscribe({
      next: data => {
        this.puntos = data;
        this.puntosGuardados = new Map(data.map(punto => [punto.id, { x: punto.x, y: punto.y }]));
        this.cdr.markForCheck();
      },
      error: error => this.mostrarError(error)
    });
  }

  private cargarBicicletas(): void {    this.bicicletaService.getAll().subscribe({
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
