import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { BicicletaService, Bicicleta } from '../shared/services/bicicleta.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule,
    MatInputModule, MatSelectModule, MatCardModule, MatIconModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  bicicletas: Bicicleta[] = [];
  columnas = ['codigo', 'modelo', 'ubicacion', 'estado', 'acciones'];
  mostrarFormulario = false;
  estados = ['DISPONIBLE', 'RESERVADA', 'EN_USO', 'APTA', 'NO_APTA'];

  nueva: Bicicleta = {
    codigo: '', modelo: '', ubicacion: '', estado: 'DISPONIBLE',
    fecha_ultima_revision: null, tecnico_responsable: null
  };

  constructor(private bicicletaService: BicicletaService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.bicicletaService.getAll().subscribe(data => this.bicicletas = data);
  }

  crear(): void {
    this.bicicletaService.create(this.nueva).subscribe(() => {
      this.cargar();
      this.mostrarFormulario = false;
      this.nueva = { codigo: '', modelo: '', ubicacion: '', estado: 'DISPONIBLE', fecha_ultima_revision: null, tecnico_responsable: null };
    });
  }

  eliminar(id: string): void {
    if (confirm('¿Eliminár esta bicicleta?')) {
      this.bicicletaService.delete(id).subscribe(() => this.cargar());
    }
  }

  cambiarEstado(bici: Bicicleta, estado: string): void {
    this.bicicletaService.update(bici.id!, { estado: estado as Bicicleta['estado'] }).subscribe(() => this.cargar());
  }
}
