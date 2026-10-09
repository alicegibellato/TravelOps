/** Indirizzi delle pagine della web app. */

export function percorsoViaggio(chiave: string): string {
  return `/viaggi/${encodeURIComponent(chiave)}`;
}

export function percorsoGiorno(chiave: string, data: string): string {
  return `${percorsoViaggio(chiave)}/giorni/${encodeURIComponent(data)}`;
}

export function percorsoElemento(chiave: string, id: string): string {
  return `${percorsoViaggio(chiave)}/elementi/${encodeURIComponent(id)}`;
}
