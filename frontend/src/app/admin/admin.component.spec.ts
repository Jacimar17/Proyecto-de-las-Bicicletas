import { TestBed } from '@angular/core/testing';
import { AdminComponent } from './admin.component';
import { BicicletaService } from '../shared/services/bicicleta.service';
import { EstacionService } from '../shared/services/estacion.service';
import { UsuarioService } from '../shared/services/usuario.service';

describe('AdminComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        { provide: BicicletaService, useValue: {} },
        { provide: EstacionService, useValue: {} },
        { provide: UsuarioService, useValue: {} }
      ]
    }).compileComponents();
  });

  it('updates station coordinates when a map point is selected', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;

    component.seleccionarCoordenadas(-34.6037, -58.3816);

    expect(component.estacionForm.lat).toBe(-34.6037);
    expect(component.estacionForm.lng).toBe(-58.3816);
  });

  it('ignores coordinates outside valid latitude and longitude ranges', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;
    const coordenadasIniciales = { ...component.estacionForm };

    component.seleccionarCoordenadas(91, -58.3816);

    expect(component.estacionForm).toEqual(coordenadasIniciales);
  });
});
