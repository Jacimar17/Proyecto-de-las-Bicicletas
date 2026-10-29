import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UsuarioService } from './shared/services/usuario.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Bicicletas';

  constructor(readonly usuarioService: UsuarioService, private router: Router) {}

  cerrarSesion(): void {
    this.usuarioService.salir();
    void this.router.navigateByUrl('/mapa');
  }
}
