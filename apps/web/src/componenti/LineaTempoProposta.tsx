import { Badge, type TonoBadge } from "../ui/Badge";
import { LineaTempo, type VoceLineaTempo } from "../ui/LineaTempo";
import type { CambioVoce, GiornoProposta, VoceGiornoProposta } from "../viste/proposta";
import type { SegnaliElemento } from "../viste/segnalazioni";
import { RiepilogoPrenotazione } from "./GestisciPrenotazione";
import { ProblemaInRiga } from "./TabellaElementi";

const CAMBI: Readonly<Record<CambioVoce, { etichetta: string; tono: TonoBadge }>> = {
  rimosso: { etichetta: "Tolto", tono: "errore" },
  aggiunto: { etichetta: "Aggiunto", tono: "successo" },
  spostato: { etichetta: "Spostato", tono: "attenzione" },
};

function classeVoce(voce: VoceGiornoProposta, segnali: SegnaliElemento | undefined): string {
  const classi: string[] = [];
  if (voce.cambio !== null) classi.push(`ui-linea-tempo__voce--${voce.cambio}`);
  if (segnali?.aRischio) classi.push("elemento--a-rischio");
  if (segnali !== undefined && segnali.problemi.length > 0) classi.push("elemento--con-problemi");
  return classi.join(" ");
}

function ExtraVoce({ voce, segnali }: { voce: VoceGiornoProposta; segnali: SegnaliElemento | undefined }) {
  const { riga, cambio } = voce;
  const etichette = cambio !== null || segnali?.aRischio === true;
  return (
    <div className="voce-extra" data-rimosso={cambio === "rimosso" ? riga.id : undefined}>
      {etichette && (
        <div className="voce-extra__etichette">
          {cambio !== null && <Badge tono={CAMBI[cambio].tono}>{CAMBI[cambio].etichetta}</Badge>}
          {segnali?.aRischio === true && <Badge tono="errore">A rischio</Badge>}
        </div>
      )}
      {segnali?.problemi.map((problema, indice) => (
        <ProblemaInRiga key={`${problema.codice}-${indice}`} problema={problema} />
      ))}
      {cambio !== "rimosso" && <RiepilogoPrenotazione prenotazione={riga.prenotazione} />}
    </div>
  );
}

function voceLineaTempo(voce: VoceGiornoProposta, segnali: SegnaliElemento | undefined): VoceLineaTempo {
  const { riga, cambio } = voce;
  const comuni = {
    chiave: `${cambio ?? "invariato"}-${riga.id}`,
    // Un elemento tolto non è più nell'itinerario: niente evidenziazione collegata.
    elementoId: cambio === "rimosso" ? undefined : riga.id,
    inizio: riga.inizio,
    classe: classeVoce(voce, segnali),
    extra: <ExtraVoce voce={voce} segnali={segnali} />,
  };
  if (riga.tipo === "spostamento" && riga.mezzoId !== null) {
    return {
      ...comuni,
      tipo: "spostamento",
      mezzo: riga.mezzoId,
      mezzoEtichetta: riga.mezzo ?? undefined,
      descrizione: riga.descrizione,
      orario: riga.orario,
      durata: riga.durata ?? undefined,
    };
  }
  return {
    ...comuni,
    tipo: "attivita",
    nome: riga.descrizione,
    orario: riga.orario,
    durata: riga.durata ?? undefined,
    stile: riga.attivita?.stile,
    costo: riga.attivita?.costo ?? undefined,
    allAperto: riga.attivita?.allAperto,
  };
}

/**
 * Il giorno con la proposta come linea del tempo: gli elementi tolti restano al loro posto, barrati e in rosso; gli
 * aggiunti sono in verde, gli spostati in giallo. Il colore non è mai l'unico segnale: ogni voce ha anche la parola.
 */
export function LineaTempoProposta({ giorno }: { giorno: GiornoProposta }) {
  const voci = giorno.voci.map((voce) => voceLineaTempo(voce, giorno.segnali.perElemento[voce.riga.id]));
  return <LineaTempo voci={voci} etichetta="Il giorno con la proposta" />;
}
