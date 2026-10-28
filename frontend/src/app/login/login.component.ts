import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
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

  constructor(private usuarioService: UsuarioService, private router: Router) {}

  login(): void {
    this.error = '';
    this.cargando = true;
    this.usuarioService.login({ dni: this.dni, password: this.password }).subscribe({
      next: (response) => {
        this.cargando = false;
        this.usuarioService.guardarSesion(response);
        const destino = response.role === 'admin' ? '/admin' :
          response.role === 'tecnico' ? '/tecnico' : '/mapa';
        void this.router.navigateByUrl(destino);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.message || 'Error al iniciar sesión';
      }
    });
  }
}
