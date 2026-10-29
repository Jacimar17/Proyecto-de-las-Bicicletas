import { AfterViewInit, Component, ElementRef, NgZone, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { LoginResponse, UsuarioService } from '../shared/services/usuario.service';
import { GOOGLE_CLIENT_ID } from '../shared/google-config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatInputModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('googleButton') googleButton!: ElementRef<HTMLElement>;

  dni = '';
  password = '';
  error = '';
  cargando = false;

  readonly googleHabilitado = !!GOOGLE_CLIENT_ID;

  constructor(private usuarioService: UsuarioService, private router: Router, private zone: NgZone) {}

  ngAfterViewInit(): void {
    if (!GOOGLE_CLIENT_ID) return;
    const iniciar = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) {
        setTimeout(iniciar, 200);
        return;
      }
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (r: { credential: string }) => this.zone.run(() => this.loginGoogle(r.credential))
      });
      google.accounts.id.renderButton(this.googleButton.nativeElement, {
        theme: 'outline', size: 'large', text: 'signin_with', width: 280
      });
    };
    iniciar();
  }

  login(): void {
    this.error = '';
    this.cargando = true;
    this.usuarioService.login({ dni: this.dni, password: this.password }).subscribe(this.observador());
  }

  private loginGoogle(credential: string): void {
    this.error = '';
    this.cargando = true;
    this.usuarioService.loginGoogle(credential).subscribe(this.observador());
  }

  private observador() {
    return {
      next: (response: LoginResponse) => {
        this.cargando = false;
        this.usuarioService.guardarSesion(response);
        const destino = response.role === 'admin' ? '/admin' :
          response.role === 'tecnico' ? '/tecnico' : '/mapa';
        void this.router.navigateByUrl(destino);
      },
      error: (err: any) => {
        this.cargando = false;
        this.error = err.error?.message || 'Error al iniciar sesión';
      }
    };
  }
}
