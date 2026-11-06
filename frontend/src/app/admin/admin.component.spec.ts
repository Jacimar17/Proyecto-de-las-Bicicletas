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

  it('marks a station unavailable when it already stores 15 bicycles', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;
    const station = {
      id: 'station-1',
      nombre: 'Centro',
      barrio: 'Centro',
      direccion: 'Belgrano 1',
      lat: 0,
      lng: 0,
      capacidad: 15,
      activa: true,
      total_bicicletas: 15,
      disponibles: 15
    };
    component.estaciones = [station];
    component.bicicletaForm.estacion_id = station.id;

    expect(component.estacionAlmacenamientoCompleta(station)).toBe(true);
    expect(component.estacionDestinoCompleta).toBe(true);
  });

  it('allows editing a bicycle without counting its current station assignment as a new one', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;
    const station = {
      id: 'station-1',
      nombre: 'Centro',
      barrio: 'Centro',
      direccion: 'Belgrano 1',
      lat: 0,
      lng: 0,
      capacidad: 15,
      activa: true,
      total_bicicletas: 15,
      disponibles: 15
    };
    component.estaciones = [station];
    component.bicicletas = Array.from({ length: 15 }, (_, index) => ({
      id: `bike-${index}`,
      codigo: `BIC-${index}`,
      modelo: 'Urbana',
      ubicacion: 'Centro',
      estado: 'DISPONIBLE' as const,
      estacion_id: station.id,
      fecha_ultima_revision: null,
      tecnico_responsable: null
    }));
    component.seleccionado = 'bike-0';
    component.bicicletaForm.estacion_id = station.id;

    expect(component.estacionDestinoCompleta).toBe(false);
  });

  it('shows the actual station total even when the displayed available count is capped', () => {
    const fixture = TestBed.createComponent(AdminComponent);
    const component = fixture.componentInstance;
    const station = {
      id: 'station-1',
      nombre: 'Centro',
      barrio: 'Centro',
      direccion: 'Belgrano 1',
      lat: 0,
      lng: 0,
      capacidad: 15,
      activa: true,
      total_bicicletas: 15,
      disponibles: 15
    };
    component.estaciones = [station];
    component.bicicletas = Array.from({ length: 16 }, (_, index) => ({
      id: `bike-${index}`,
      codigo: `BIC-${index}`,
      modelo: 'Urbana',
      ubicacion: 'Centro',
      estado: 'DISPONIBLE' as const,
      estacion_id: station.id,
      fecha_ultima_revision: null,
      tecnico_responsable: null
    }));

    expect(component.totalBicicletasEstacion(station)).toBe(16);
    expect(component.estacionAlmacenamientoCompleta(station)).toBe(true);
  });
});
