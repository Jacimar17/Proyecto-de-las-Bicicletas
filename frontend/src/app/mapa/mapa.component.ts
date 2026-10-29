import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Bicicleta } from '../shared/services/bicicleta.service';
import { Estacion, EstacionDetalle, EstacionService } from '../shared/services/estacion.service';
import { UsuarioService } from '../shared/services/usuario.service';
import { Viaje, ViajeService } from '../shared/services/viaje.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './mapa.component.html'
})
export class MapaComponent implements AfterViewInit, OnDestroy {
  cargando = true;
  estaciones: Estacion[] = [];
  estacionIdSeleccionada = '';
  estacionSeleccionada: EstacionDetalle | null = null;
  bicicletaId = '';
  estacionDestinoId = '';
  viajeActivo: Viaje | null = null;
  error = '';
  mensaje = '';
  private map!: L.Map;
  private readonly marcadores = L.layerGroup();

  constructor(
    private readonly estacionService: EstacionService,
    private readonly viajeService: ViajeService,
    readonly usuarioService: UsuarioService
  ) {}

  get bicicletasDisponibles(): Bicicleta[] {
    return this.estacionSeleccionada?.bicicletas.filter(bicicleta => bicicleta.estado === 'DISPONIBLE') ?? [];
  }

  get estacionesActivas(): number {
    return this.estaciones.filter(estacion => estacion.activa).length;
  }

  get bicicletasTotalesDisponibles(): number {
    return this.estaciones.reduce((total, estacion) => total + (estacion.activa ? estacion.disponibles : 0), 0);
  }

  get estacionesFiltradas(): Estacion[] {
    const consulta = this.busquedaEstacion.trim().toLocaleLowerCase();
    return this.estaciones.filter(estacion => {
      const coincideBusqueda = !consulta
        || estacion.nombre.toLocaleLowerCase().includes(consulta)
        || estacion.direccion.toLocaleLowerCase().includes(consulta);
      return coincideBusqueda && (!this.soloDisponibles || (estacion.activa && estacion.disponibles > 0));
    });
  }

  get esCliente(): boolean {
    return this.usuarioService.usuarioActual?.role === 'cliente';
  }

  busquedaEstacion = '';
  soloDisponibles = false;

  nombreEstacion(id: string): string {
    return this.estaciones.find(estacion => estacion.id === id)?.nombre ?? id;
  }

  ngAfterViewInit(): void {
    this.map = L.map('mapa').setView([-33.7467, -61.9629], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
    this.marcadores.addTo(this.map);
    this.cargarEstaciones();
    if (this.esCliente) {
      this.viajeService.getActive().subscribe({
        next: viaje => this.viajeActivo = viaje,
        error: error => this.mostrarError(error)
      });
    }
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  seleccionarEstacion(id: string): void {
    this.estacionIdSeleccionada = id;
    this.estacionSeleccionada = null;
    this.bicicletaId = '';
    if (!id) return;
    this.estacionService.getById(id).subscribe({
      next: estacion => {
        this.estacionSeleccionada = estacion;
        this.estacionDestinoId = estacion.activa ? estacion.id ?? '' : '';
      },
      error: error => this.mostrarError(error)
    });
  }

  comenzarViaje(): void {
    if (!this.estacionSeleccionada?.id || !this.bicicletaId) return;
    this.error = '';
    this.mensaje = '';
    this.viajeService.start(this.bicicletaId, this.estacionSeleccionada.id).subscribe({
      next: viaje => {
        this.viajeActivo = viaje;
        this.bicicletaId = '';
        this.mensaje = 'Viaje iniciado. ¡Buen recorrido!';
        this.actualizarDisponibilidad();
      },
      error: error => this.mostrarError(error)
    });
  }

  devolverBicicleta(): void {
    if (!this.estacionDestinoId) return;
    this.error = '';
    this.mensaje = '';
    this.viajeService.finish(this.estacionDestinoId).subscribe({
      next: () => {
        this.viajeActivo = null;
        this.mensaje = 'Bicicleta devuelta correctamente.';
        this.actualizarDisponibilidad();
      },
      error: error => this.mostrarError(error)
    });
  }

  private cargarEstaciones(): void {
    this.estacionService.getAll().subscribe({
      next: estaciones => {
        this.estaciones = estaciones;
        this.cargando = false;
        this.marcadores.clearLayers();
        estaciones.forEach(estacion => this.agregarMarcador(estacion));
        const coordenadas = estaciones
          .filter(estacion => estacion.activa)
          .map(estacion => [estacion.lat, estacion.lng] as L.LatLngTuple);
        if (coordenadas.length) {
          this.map.fitBounds(L.latLngBounds(coordenadas), { padding: [40, 40] });
        }
      },
      error: error => {
        this.cargando = false;
        this.mostrarError(error);
      }
    });
  }

  private actualizarDisponibilidad(): void {
    this.cargarEstaciones();
    if (this.estacionSeleccionada?.id) this.seleccionarEstacion(this.estacionSeleccionada.id);
  }

  private agregarMarcador(estacion: Estacion): void {
    const icono = L.divIcon({
      html: `<div style="background:${estacion.activa ? '#187653' : '#89958e'};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(23,54,38,.3);"></div>`,
      className: 'station-map-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([estacion.lat, estacion.lng], { icon: icono })
      .addTo(this.marcadores)
      .bindPopup(this.crearPopup(estacion))
      .on('click', () => this.seleccionarEstacion(estacion.id ?? ''));
  }

  private crearPopup(estacion: Estacion): HTMLElement {
    const contenedor = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = estacion.nombre;
    const direccion = document.createElement('div');
    direccion.textContent = estacion.direccion;
    const disponibilidad = document.createElement('div');
    disponibilidad.style.marginTop = '6px';
    disponibilidad.textContent = estacion.activa
      ? `Disponibles: ${estacion.disponibles} de ${estacion.capacidad} bicicletas`
      : 'Estación no habilitada';
    contenedor.append(titulo, direccion, disponibilidad);
    return contenedor;
  }

  private mostrarError(error: { error?: { message?: string } }): void {
    this.error = error.error?.message ?? 'No se pudo completar la operación';
    this.mensaje = '';
  }
}
