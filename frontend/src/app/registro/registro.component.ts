import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UsuarioService } from '../shared/services/usuario.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent {

  nombre = '';
  dni = '';
  email = '';
  password = '';
  error = '';
  cargando = false;

  constructor(private usuarioService: UsuarioService) {}

  registro(): void {
    this.error = '';
    this.cargando = true;
    this.usuarioService.registro({ nombre: this.nombre, dni: this.dni, email: this.email, password: this.password }).subscribe({
      next: () => {
        this.cargando = false;
        alert('¡Registro exitoso! Ya podés iniciar sesión.');
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'Error al registrarse';
      }
    });
  }
}
