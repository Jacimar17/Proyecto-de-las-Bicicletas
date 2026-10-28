const STATUS_TO_ESTADO: Record<string, string> = {
  AVAILABLE: "DISPONIBLE",
  IN_USE: "EN_USO",
  NOT_SUITABLE: "EN_MANTENIMIENTO",
};

const ESTADO_TO_STATUS: Record<string, string> = {
  DISPONIBLE: "AVAILABLE",
  APTA: "AVAILABLE",
  RESERVADA: "IN_USE",
  EN_USO: "IN_USE",
  EN_MANTENIMIENTO: "NOT_SUITABLE",
  NO_APTA: "NOT_SUITABLE",
};

const FIELD_PAIRS: Array<[string, string]> = [
  ["code", "codigo"],
  ["currentStation", "ubicacion"],
  ["rentedBy", "usuario_id"],
];

/**
 * Las bicicletas viven en una sola colección usada por las APIs en inglés y en español.
 * Cada escritura completa el juego de campos equivalente para que ambas lean lo mismo.
 */
export function mirrorBicycleFields<T extends object>(data: T): T {
  const result: Record<string, unknown> = { ...(data as Record<string, unknown>) };

  const status = result.status;
  const estado = result.estado;
  if (typeof estado === "string" && !("status" in result)) {
    result.status = ESTADO_TO_STATUS[estado] ?? "AVAILABLE";
  } else if (typeof status === "string" && !("estado" in result)) {
    result.estado = STATUS_TO_ESTADO[status] ?? "DISPONIBLE";
  }

  for (const [english, spanish] of FIELD_PAIRS) {
    if (english in result && !(spanish in result)) result[spanish] = result[english];
    else if (spanish in result && !(english in result)) result[english] = result[spanish];
  }

  return result as T;
}
