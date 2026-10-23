import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import * as L from 'leaflet';
import { EstacionService, Estacion } from '../shared/services/estacion.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

const COORDENADAS_ESTACIONES: Record<string, L.LatLngTuple> = {
  Centro: [-33.7456, -61.9688],
  'San Martín': [-33.742, -61.972],
  Belgrano: [-33.75, -61.964],
  'Tiro Federal': [-33.738, -61.956],
  'Juan XXIII': [-33.755, -61.98]
};

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.css'
})
export class MapaComponent implements AfterViewInit, OnDestroy {

  cargando = true;
  private map!: L.Map;

  constructor(private estacionService: EstacionService) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.cargarEstaciones();
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map('mapa').setView([-33.7467, -61.9629], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private cargarEstaciones(): void {
    this.estacionService.getAll().subscribe({
      next: (estaciones) => {
        this.cargando = false;
        const estacionesConCoordenadas = estaciones.filter(
          estacion => COORDENADAS_ESTACIONES[estacion.nombre]
        );

        estacionesConCoordenadas.forEach(estacion => this.agregarMarcador(estacion));

        if (estacionesConCoordenadas.length) {
          this.map.fitBounds(
            L.latLngBounds(
              estacionesConCoordenadas.map(
                estacion => COORDENADAS_ESTACIONES[estacion.nombre]
              )
            ),
            { padding: [50, 50] }
          );
        }
      },
      error: (error: unknown) => {
        console.error('No se pudieron cargar las estaciones', error);
        this.cargando = false;
      }
    });
  }

  private agregarMarcador(estacion: Estacion): void {
    const icono = L.divIcon({
      html: '<div style="background:#1976d2;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,.5);"></div>',
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker(COORDENADAS_ESTACIONES[estacion.nombre], { icon: icono })
      .addTo(this.map)
      .bindPopup(this.crearPopup(estacion));
  }

  private crearPopup(estacion: Estacion): HTMLElement {
    const contenedor = document.createElement('div');
    const titulo = document.createElement('strong');
    titulo.textContent = estacion.nombre;

    const direccion = document.createElement('div');
    direccion.textContent = estacion.direccion;

    const disponibilidad = document.createElement('div');
    disponibilidad.style.marginTop = '6px';
    disponibilidad.textContent =
      `Disponibles: ${estacion.disponibles} de ${estacion.capacidad} bicicletas`;

    contenedor.append(titulo, direccion, disponibilidad);
    return contenedor;
  }
}
