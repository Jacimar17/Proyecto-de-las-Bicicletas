import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { BicicletaService, Bicicleta } from '../shared/services/bicicleta.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.css'
})
export class MapaComponent implements AfterViewInit {

  cargando = true;
  private map!: L.Map;

  constructor(private bicicletaService: BicicletaService) {}

  ngAfterViewInit(): void {
    this.initMap();
    this.cargarBicicletas();
  }

  private initMap(): void {
    // Centra en Venado Tuerto
    this.map = L.map('mapa').setView([-33.7467, -61.9629], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);
  }

  private cargarBicicletas(): void {
    this.bicicletaService.getAll().subscribe({
      next: (bicicletas) => {
        this.cargando = false;
        bicicletas.forEach(b => this.agregarMarcador(b));
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  private agregarMarcador(bicicleta: Bicicleta): void {
    // Posición random cerca del centro para demo
    const lat = -33.7467 + (Math.random() - 0.5) * 0.05;
    const lng = -61.9629 + (Math.random() - 0.5) * 0.05;

    const color = bicicleta.estado === 'DISPONIBLE' ? 'green' : 'red';

    const icono = L.divIcon({
      html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;"></div>`,
      className: ''
    });

    L.marker([lat, lng], { icon: icono })
      .addTo(this.map)
      .bindPopup(`
        <b>${bicicleta.codigo}</b><br>
        Modelo: ${bicicleta.modelo}<br>
        Estado: ${bicicleta.estado}<br>
        Ubicación: ${bicicleta.ubicacion}
      `);
  }
}
