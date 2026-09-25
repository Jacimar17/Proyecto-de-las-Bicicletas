import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UsuarioService } from '../shared/services/usuario.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  dni = '';
  password = '';
  error = '';
  cargando = false;

  constructor(private usuarioService: UsuarioService) {}

  login(): void {
    this.error = '';
    this.cargando = true;
    this.usuarioService.login({ dni: this.dni, password: this.password }).subscribe({
      next: (usuario) => {
        this.cargando = false;
        alert(`Bienvenido, ${usuario.nombre}!`);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'Error al iniciar sesión';
      }
    });
  }
}
