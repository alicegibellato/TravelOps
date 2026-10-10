import { Cloud, CloudLightning, CloudOff, CloudRain, Snowflake, Sun } from "lucide-react";
import type { CondizioneMeteo } from "@travelops/engine";
import type { MeteoGiornoVista } from "@travelops/sources";

const ASPETTO: Readonly<Record<CondizioneMeteo, { testo: string; icona: typeof Sun }>> = {
  sereno: { testo: "Sereno", icona: Sun },
  nuvoloso: { testo: "Nuvoloso", icona: Cloud },
  pioggia: { testo: "Pioggia", icona: CloudRain },
  temporale: { testo: "Temporale", icona: CloudLightning },
  neve: { testo: "Neve", icona: Snowflake },
};

const gradi = (n: number): string => `${Math.round(n)}°`;

/**
 * La previsione sintetica di un giorno (REQ-INTEG-001, CA-4): condizione, temperature e probabilità di pioggia.
 * Se il servizio non risponde, lo dice (CA-3). Con dati di esempio (meteo finto) lo dichiara, così non sembra una previsione vera.
 */
export function PrevisioneGiorno({ meteo }: { meteo: MeteoGiornoVista }) {
  if (!meteo.disponibile) {
    return (
      <p className="previsione-giorno previsione-giorno--assente" data-meteo="non-disponibile">
        <CloudOff size={16} aria-hidden="true" /> {meteo.messaggio}
      </p>
    );
  }
  const { previsione, origine } = meteo;
  const { testo, icona: Icona } = ASPETTO[previsione.condizione];
  const { temperaturaMin: min, temperaturaMax: max, probabilitaPrecipitazioni: pioggia } = previsione;
  return (
    <p className="previsione-giorno" data-meteo={previsione.condizione} data-origine={origine}>
      <Icona size={16} aria-hidden="true" />
      <span className="previsione-giorno__condizione">{testo}</span>
      {min !== null && max !== null && (
        <span>
          {gradi(min)}–{gradi(max)}
        </span>
      )}
      {pioggia !== null && pioggia > 0 && <span>Pioggia {Math.round(pioggia)}%</span>}
      {origine === "finto" && <span className="previsione-giorno__esempio">(esempio)</span>}
    </p>
  );
}
