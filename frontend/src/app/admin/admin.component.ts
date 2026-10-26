import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Bicicleta, BicicletaService } from '../shared/services/bicicleta.service';
import { Estacion, EstacionService } from '../shared/services/estacion.service';
import { RolUsuario, Usuario, UsuarioService } from '../shared/services/usuario.service';

type SeccionAdmin = 'usuarios' | 'bicicletas' | 'estaciones';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  seccion: SeccionAdmin = 'bicicletas';
  usuarios: Usuario[] = [];
  bicicletas: Bicicleta[] = [];
  estaciones: Estacion[] = [];
  seleccionado: string | null = null;
  error = '';
  mensaje = '';

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

  constructor(
    private readonly bicicletaService: BicicletaService,
    private readonly estacionService: EstacionService,
    private readonly usuarioService: UsuarioService
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.cargarUsuarios();
    this.cargarBicicletas();
    this.cargarEstaciones();
  }

  cambiarSeccion(seccion: SeccionAdmin): void {
    this.limpiarFormulario();
    this.seccion = seccion;
  }

  guardar(): void {
    this.error = '';
    this.mensaje = '';
    if (this.seccion === 'usuarios') this.guardarUsuario();
    else if (this.seccion === 'bicicletas') this.guardarBicicleta();
    else this.guardarEstacion();
  }

  editarUsuario(usuario: Usuario): void {
    this.seleccionado = usuario.id ?? null;
    this.usuarioForm = { ...usuario, password: '' };
  }

  eliminarUsuario(usuario: Usuario): void {
    if (!usuario.id || !confirm(`¿Eliminar al usuario ${usuario.nombre}?`)) return;
    this.usuarioService.delete(usuario.id).subscribe({
      next: () => { this.mensaje = 'Usuario eliminado'; this.cargarUsuarios(); },
      error: error => this.mostrarError(error)
    });
  }

  editarBicicleta(bicicleta: Bicicleta): void {
    this.seleccionado = bicicleta.id ?? null;
    this.bicicletaForm = { ...bicicleta };
  }

  eliminarBicicleta(bicicleta: Bicicleta): void {
    if (!bicicleta.id || !confirm(`¿Eliminar la bicicleta ${bicicleta.codigo}?`)) return;
    this.bicicletaService.delete(bicicleta.id).subscribe({
      next: () => { this.mensaje = 'Bicicleta eliminada'; this.cargarBicicletas(); this.cargarEstaciones(); },
      error: error => this.mostrarError(error)
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
  }

  eliminarEstacion(estacion: Estacion): void {
    if (!estacion.id || !confirm(`¿Eliminar la estación ${estacion.nombre}?`)) return;
    this.estacionService.delete(estacion.id).subscribe({
      next: () => { this.mensaje = 'Estación eliminada'; this.cargarEstaciones(); },
      error: error => this.mostrarError(error)
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
    this.error = '';
    this.mensaje = '';
  }

  private guardarUsuario(): void {
    const { password, ...datos } = this.usuarioForm;
    const request = this.seleccionado
      ? this.usuarioService.update(this.seleccionado, { ...datos, ...(password ? { password } : {}) })
      : this.usuarioService.create({ ...datos, password });
    request.subscribe({
      next: () => { this.mensaje = 'Usuario guardado'; this.limpiarFormulario(); this.cargarUsuarios(); },
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
      next: () => { this.mensaje = 'Bicicleta guardada'; this.limpiarFormulario(); this.cargarBicicletas(); this.cargarEstaciones(); },
      error: error => this.mostrarError(error)
    });
  }

  private guardarEstacion(): void {
    const request = this.seleccionado
      ? this.estacionService.update(this.seleccionado, this.estacionForm)
      : this.estacionService.create(this.estacionForm);
    request.subscribe({
      next: () => { this.mensaje = 'Estación guardada'; this.limpiarFormulario(); this.cargarEstaciones(); },
      error: error => this.mostrarError(error)
    });
  }

  private cargarUsuarios(): void {
    this.usuarioService.getAll().subscribe({
      next: data => this.usuarios = data,
      error: error => this.mostrarError(error)
    });
  }

  private cargarBicicletas(): void {
    this.bicicletaService.getAll().subscribe({
      next: data => this.bicicletas = data,
      error: error => this.mostrarError(error)
    });
  }

  private cargarEstaciones(): void {
    this.estacionService.getAll().subscribe({
      next: data => this.estaciones = data,
      error: error => this.mostrarError(error)
    });
  }

  private mostrarError(error: { error?: { message?: string } }): void {
    this.error = error.error?.message ?? 'No se pudo completar la operación';
    this.mensaje = '';
  }
}
