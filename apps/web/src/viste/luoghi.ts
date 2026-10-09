/** Riferimenti al catalogo risolti con le funzioni di interrogazione del motore. */
import { trovaAttivita, trovaLuogo, trovaZona, type Catalogo, type Coordinate } from "@travelops/engine";

export interface RiferimentoLuogo {
  id: string;
  nome: string;
  coordinate: Coordinate | null;
}

/** Il luogo con quell'id; se manca dal catalogo (non succede con dati validati) si mostra l'id. */
export function riferimentoLuogo(catalogo: Catalogo, id: string): RiferimentoLuogo {
  const luogo = trovaLuogo(catalogo, id);
  return { id, nome: luogo?.nome ?? id, coordinate: luogo?.coordinate ?? null };
}

export function nomeAttivita(catalogo: Catalogo, id: string): string {
  return trovaAttivita(catalogo, id)?.nome ?? id;
}

export function nomeZona(catalogo: Catalogo, id: string): string {
  return trovaZona(catalogo, id)?.nome ?? id;
}
