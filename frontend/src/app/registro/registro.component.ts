import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { UsuarioService } from '../shared/services/usuario.service';
import { NotificationService } from '../shared/notification.service';

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
  cargando = false;

  constructor(private usuarioService: UsuarioService, private router: Router, private notifications: NotificationService) {}

  registro(): void {
    this.cargando = true;
    this.usuarioService.registro({ nombre: this.nombre, dni: this.dni, email: this.email, password: this.password }).subscribe({
      next: () => {
        this.usuarioService.login({ dni: this.dni, password: this.password }).subscribe({
          next: response => {
            this.cargando = false;
            this.usuarioService.guardarSesion(response);
            void this.router.navigateByUrl('/mapa');
          },
          error: () => {
            this.cargando = false;
            void this.router.navigateByUrl('/login');
          }
        });
      },
      error: (err) => {
        this.cargando = false;
        this.notifications.httpError(err, 'Error al registrarse');
      }
    });
  }
}
