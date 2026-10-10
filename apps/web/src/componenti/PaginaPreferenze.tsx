import { PercorsoPreferenze } from "./PercorsoPreferenze";

type Proprieta = Parameters<typeof PercorsoPreferenze>[0];

/** Pagina «Le tue preferenze» (REQ-PREF-001): il percorso guidato in 5 passi con il riepilogo vivo. */
export function PaginaPreferenze(proprieta: Proprieta) {
  return (
    <section className="pagina-preferenze" aria-labelledby="preferenze-titolo">
      <h1 id="preferenze-titolo">Racconta il tuo viaggio</h1>
      <PercorsoPreferenze {...proprieta} />
    </section>
  );
}
