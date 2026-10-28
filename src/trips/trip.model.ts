export interface Trip {
  id?: string;
  usuarioId: string;
  bicicletaId: string;
  estacionOrigenId: string;
  estacionDestinoId: string | null;
  fechaInicio: Date;
  fechaFin: Date | null;
}
