import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario, UsuarioService } from '../shared/services/usuario.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css'
})
export class PerfilComponent implements OnInit {
  usuario: Usuario | null = null;

  constructor(
    private readonly usuarioService: UsuarioService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.usuario = this.usuarioService.usuarioActual;
    this.usuarioService.getPerfil().subscribe({
      next: perfil => {
        this.usuario = { ...this.usuario, ...perfil };
        this.cdr.markForCheck();
      },
      error: () => this.cdr.markForCheck()
    });
  }

  get suspendido(): boolean {
    const hasta = this.usuario?.suspendidoHasta;
    return !!hasta && new Date(hasta).getTime() > Date.now();
  }

  get estado(): string {
    if (this.usuario?.bloqueado) return 'Bloqueado';
    return this.suspendido ? 'Suspendido' : 'Activo';
  }
}
