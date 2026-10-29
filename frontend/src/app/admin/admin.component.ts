import { AfterViewChecked, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { Bicicleta, BicicletaService } from '../shared/services/bicicleta.service';
import { Estacion, EstacionService } from '../shared/services/estacion.service';
import { RolUsuario, Usuario, UsuarioService } from '../shared/services/usuario.service';
import { Viaje, ViajeService } from '../shared/services/viaje.service';
import { Mantenimiento, MantenimientoService } from '../shared/services/mantenimiento.service';
import { NotificationService } from '../shared/notification.service';
import { ZONAS, TareaMantenimiento, TareaMantenimientoService, ZonaBicicleta, etiquetaZona } from '../shared/services/tarea-mantenimiento.service';

type SeccionAdmin = 'usuarios' | 'bicicletas' | 'estaciones' | 'viajes' | 'mantenimientos' | 'tareas';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit, AfterViewChecked, OnDestroy {
  seccion: SeccionAdmin = 'bicicletas';
  usuarios: Usuario[] = [];
  bicicletas: Bicicleta[] = [];
  estaciones: Estacion[] = [];
  viajes: Viaje[] = [];
  mantenimientos: Mantenimiento[] = [];
  seleccionado: string | null = null;
  tareas: TareaMantenimiento[] = [];
  tareaForm: { zona: ZonaBicicleta; nombre: string } = { zona: 'cadena', nombre: '' };
  readonly zonas = ZONAS;
  readonly etiquetaZona = etiquetaZona;

  tareasDeZona(zona: ZonaBicicleta): TareaMantenimiento[] {
    return this.tareas.filter(tarea => tarea.zona === zona);
  }


  usuarioForm = {
    dni: '', nombre: '', email: '', password: '', role: 'cliente' as RolUsuario, bloqueado: false
  };
  bicicletaForm: Bicicleta = {
    codigo: '', modelo: '', ubicacion: '', estado: 'DISPONIBLE', estacion_id: null,
    fecha_ultima_revision: null, tecnico_responsable: null
  };
  estacionForm = {
    nombre: '', barrio: '', direccion: '', lat: -33.7456, lng: -61.9688,
    capacidad: 10, activa: true
  };

  readonly roles: RolUsuario[] = ['cliente', 'admin', 'tecnico'];
  readonly estadosBicicleta: Bicicleta['estado'][] = [
    'DISPONIBLE', 'RESERVADA', 'EN_USO', 'EN_MANTENIMIENTO', 'APTA', 'NO_APTA'
  ];

  private mapaEstacion: L.Map | null = null;
  private marcadorEstacion: L.Marker | null = null;

  constructor(
    private readonly bicicletaService: BicicletaService,
    private readonly estacionService: EstacionService,
    private readonly usuarioService: UsuarioService,
    private readonly viajeService: ViajeService,
    private readonly mantenimientoService: MantenimientoService,
    private readonly tareaService: TareaMantenimientoService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notifications: NotificationService
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  ngAfterViewChecked(): void {
    if (this.seccion === 'estaciones') this.inicializarMapaEstacion();
  }

  ngOnDestroy(): void {
    this.destruirMapaEstacion();
  }

  cargarTodo(): void {
    this.cargarUsuarios();
    this.cargarBicicletas();
    this.cargarEstaciones();
  }

  nombreUsuario(id: string): string {
    return this.usuarios.find(usuario => usuario.id === id)?.nombre ?? id;
  }

  codigoBicicleta(id: string): string {
    return this.bicicletas.find(bicicleta => bicicleta.id === id)?.codigo ?? id;
  }

  nombreEstacion(id: string | null): string {
    if (!id) return 'Pendiente';
    return this.estaciones.find(estacion => estacion.id === id)?.nombre ?? id;
  }

  cambiarSeccion(seccion: SeccionAdmin): void {
    if (this.seccion === 'estaciones' && seccion !== 'estaciones') {
      this.destruirMapaEstacion();
    }
    this.limpiarFormulario();
    this.seccion = seccion;
    if (seccion === 'viajes') this.cargarViajes();
    if (seccion === 'mantenimientos') this.cargarMantenimientos();
    if (seccion === 'tareas') this.cargarTareas();
  }

  private cargarViajes(): void {
    this.viajeService.getAll().subscribe({
      next: data => { this.viajes = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  private cargarMantenimientos(): void {
    this.mantenimientoService.getAll().subscribe({
      next: data => { this.mantenimientos = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  guardar(): void {
    const accion = this.descripcionGuardado();
    void this.notifications.confirmarCambio(accion).then(ok => {
      if (!ok) return;
      if (this.seccion === 'usuarios') this.guardarUsuario();
      else if (this.seccion === 'bicicletas') this.guardarBicicleta();
      else if (this.seccion === 'estaciones') this.guardarEstacion();
    });
  }

  private descripcionGuardado(): string {
    const verbo = this.seleccionado ? 'modificar' : 'agregar';
    if (this.seccion === 'usuarios') return `Vas a ${verbo} el usuario ${this.usuarioForm.nombre} (DNI: ${this.usuarioForm.dni})`;
    if (this.seccion === 'bicicletas') return `Vas a ${verbo} la bicicleta ${this.bicicletaForm.codigo}`;
    return `Vas a ${verbo} la estación ${this.estacionForm.nombre}`;
  }

  agregarTarea(): void {
    const nombre = this.tareaForm.nombre.trim();
    if (!nombre) return;
    const zona = this.tareaForm.zona;
    void this.notifications.confirmarCambio(`Vas a agregar la tarea "${nombre}" a la zona ${etiquetaZona(zona)}`).then(ok => {
      if (!ok) return;
      this.tareaService.create({ zona, nombre }).subscribe({
        next: () => { this.notifications.success('Tarea agregada'); this.tareaForm.nombre = ''; this.cargarTareas(); },
        error: error => this.mostrarError(error)
      });
    });
  }

  eliminarTarea(tarea: TareaMantenimiento): void {
    if (!tarea.id) return;
    const id = tarea.id;
    void this.notifications.confirmarCambio(`Vas a eliminar la tarea "${tarea.nombre}" de la zona ${etiquetaZona(tarea.zona)}`).then(ok => {
      if (!ok) return;
      this.tareaService.delete(id).subscribe({
        next: () => { this.notifications.success('Tarea eliminada'); this.cargarTareas(); },
        error: error => this.mostrarError(error)
      });
    });
  }

  private cargarTareas(): void {
    this.tareaService.getAll().subscribe({
      next: data => { this.tareas = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  editarUsuario(usuario: Usuario): void {
    this.seleccionado = usuario.id ?? null;
    this.usuarioForm = { ...usuario, password: '' };
  }

  eliminarUsuario(usuario: Usuario): void {
    if (!usuario.id) return;
    const id = usuario.id;
    void this.notifications.confirmarCambio(`Vas a eliminar el usuario ${usuario.nombre} (DNI: ${usuario.dni})`).then(ok => {
      if (!ok) return;
      this.usuarioService.delete(id).subscribe({
        next: () => { this.notifications.success('Usuario eliminado'); this.cargarUsuarios(); },
        error: error => this.mostrarError(error)
      });
    });
  }

  editarBicicleta(bicicleta: Bicicleta): void {
    this.seleccionado = bicicleta.id ?? null;
    this.bicicletaForm = { ...bicicleta };
  }

  eliminarBicicleta(bicicleta: Bicicleta): void {
    if (!bicicleta.id) return;
    const id = bicicleta.id;
    void this.notifications.confirmarCambio(`Vas a dar de baja la bicicleta ${bicicleta.codigo}`).then(ok => {
      if (!ok) return;
      this.bicicletaService.delete(id).subscribe({
        next: () => { this.notifications.success('Bicicleta eliminada'); this.cargarBicicletas(); this.cargarEstaciones(); },
        error: error => this.mostrarError(error)
      });
    });
  }

  editarEstacion(estacion: Estacion): void {
    this.seleccionado = estacion.id ?? null;
    this.estacionForm = {
      nombre: estacion.nombre,
      barrio: estacion.barrio,
      direccion: estacion.direccion,
      lat: estacion.lat,
      lng: estacion.lng,
      capacidad: estacion.capacidad,
      activa: estacion.activa
    };
    this.actualizarMarcadorEstacion(true);
  }

  eliminarEstacion(estacion: Estacion): void {
    if (!estacion.id) return;
    const id = estacion.id;
    void this.notifications.confirmarCambio(`Vas a eliminar la estación ${estacion.nombre} (${estacion.direccion})`).then(ok => {
      if (!ok) return;
      this.estacionService.delete(id).subscribe({
        next: () => { this.notifications.success('Estación eliminada'); this.cargarEstaciones(); },
        error: error => this.mostrarError(error)
      });
    });
  }

  limpiarFormulario(): void {
    this.seleccionado = null;
    this.usuarioForm = { dni: '', nombre: '', email: '', password: '', role: 'cliente', bloqueado: false };
    this.bicicletaForm = {
      codigo: '', modelo: '', ubicacion: '', estado: 'DISPONIBLE', estacion_id: null,
      fecha_ultima_revision: null, tecnico_responsable: null
    };
    this.estacionForm = {
      nombre: '', barrio: '', direccion: '', lat: -33.7456, lng: -61.9688,
      capacidad: 10, activa: true
    };
    this.actualizarMarcadorEstacion(true);
  }

  seleccionarCoordenadas(lat: number, lng: number): void {
    if (!this.coordenadasValidas(lat, lng)) return;
    this.estacionForm.lat = lat;
    this.estacionForm.lng = lng;
    this.marcadorEstacion?.setLatLng([lat, lng]);
  }

  actualizarMarcadorEstacion(centrar = false): void {
    const { lat, lng } = this.estacionForm;
    if (!this.coordenadasValidas(lat, lng)) return;
    this.marcadorEstacion?.setLatLng([lat, lng]);
    if (centrar) this.mapaEstacion?.setView([lat, lng]);
  }

  private guardarUsuario(): void {
    const { password, ...datos } = this.usuarioForm;
    const request = this.seleccionado
      ? this.usuarioService.update(this.seleccionado, { ...datos, ...(password ? { password } : {}) })
      : this.usuarioService.create({ ...datos, password });
    request.subscribe({
      next: () => { this.notifications.success('Usuario guardado'); this.limpiarFormulario(); this.cargarUsuarios(); },
      error: error => this.mostrarError(error)
    });
  }

  private guardarBicicleta(): void {
    const form = { ...this.bicicletaForm };
    const estacion = this.estaciones.find(item => item.id === form.estacion_id);
    if (estacion) form.ubicacion = estacion.nombre;
    const request = this.seleccionado
      ? this.bicicletaService.update(this.seleccionado, form)
      : this.bicicletaService.create(form);
    request.subscribe({
      next: () => { this.notifications.success('Bicicleta guardada'); this.limpiarFormulario(); this.cargarBicicletas(); this.cargarEstaciones(); },
      error: error => this.mostrarError(error)
    });
  }

  private guardarEstacion(): void {
    const request = this.seleccionado
      ? this.estacionService.update(this.seleccionado, this.estacionForm)
      : this.estacionService.create(this.estacionForm);
    request.subscribe({
      next: () => { this.notifications.success('Estación guardada'); this.limpiarFormulario(); this.cargarEstaciones(); },
      error: error => this.mostrarError(error)
    });
  }

  private cargarUsuarios(): void {
    this.usuarioService.getAll().subscribe({
      next: data => { this.usuarios = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  private cargarBicicletas(): void {
    this.bicicletaService.getAll().subscribe({
      next: data => { this.bicicletas = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  private cargarEstaciones(): void {
    this.estacionService.getAll().subscribe({
      next: data => { this.estaciones = data; this.cdr.markForCheck(); },
      error: error => this.mostrarError(error)
    });
  }

  private inicializarMapaEstacion(): void {
    const contenedor = document.getElementById('estacion-mapa');
    if (!contenedor || this.mapaEstacion) return;

    this.mapaEstacion = L.map(contenedor).setView(
      [this.estacionForm.lat, this.estacionForm.lng],
      13
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.mapaEstacion);

    this.marcadorEstacion = L.marker(
      [this.estacionForm.lat, this.estacionForm.lng],
      {
        icon: L.divIcon({
          html: '<div style="width:18px;height:18px;background:#c62828;border:3px solid white;border-radius:50%;box-shadow:0 0 4px rgba(0,0,0,.5);"></div>',
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }
    ).addTo(this.mapaEstacion);
    this.mapaEstacion.on('click', event => {
      this.seleccionarCoordenadas(event.latlng.lat, event.latlng.lng);
    });
  }

  private destruirMapaEstacion(): void {
    this.mapaEstacion?.remove();
    this.mapaEstacion = null;
    this.marcadorEstacion = null;
  }

  private coordenadasValidas(lat: number, lng: number): boolean {
    return Number.isFinite(lat) && lat >= -90 && lat <= 90
      && Number.isFinite(lng) && lng >= -180 && lng <= 180;
  }

  private mostrarError(error: { status?: number; error?: { message?: string } }): void {
    this.notifications.httpError(error);
    this.cdr.markForCheck();
  }
}
