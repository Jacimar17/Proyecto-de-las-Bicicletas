import { AfterViewInit, Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { LoginResponse, UsuarioService } from '../shared/services/usuario.service';
import { NotificationService } from '../shared/notification.service';
import { GOOGLE_CLIENT_ID } from '../shared/google-config';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.css'
})
export class RegistroComponent implements AfterViewInit {
  @ViewChild('googleButton') googleButton?: ElementRef<HTMLElement>;

  nombre = '';
  dni = '';
  email = '';
  password = '';
  cargando = false;

  readonly googleHabilitado = !!GOOGLE_CLIENT_ID;

  constructor(private usuarioService: UsuarioService, private router: Router, private zone: NgZone, private notifications: NotificationService) {}

  ngAfterViewInit(): void {
    if (!GOOGLE_CLIENT_ID) return;
    const iniciar = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        setTimeout(iniciar, 200);
        return;
      }
      if (!this.googleButton) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r: { credential: string }) => this.zone.run(() => this.registroGoogle(r.credential))
      });
      google.accounts.id.renderButton(this.googleButton.nativeElement, {
        theme: 'outline', size: 'large', text: 'signup_with',
        width: Math.min(400, this.googleButton.nativeElement.clientWidth || 280)
      });
    };
    iniciar();
  }

  private registroGoogle(credential: string): void {
    this.cargando = true;
    this.usuarioService.loginGoogle(credential).subscribe({
      next: (response: LoginResponse) => {
        this.cargando = false;
        this.usuarioService.guardarSesion(response);
        void this.router.navigateByUrl('/mapa');
      },
      error: (err) => {
        this.cargando = false;
        this.notifications.httpError(err, 'Error al crear la cuenta con Google');
      }
    });
  }

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
