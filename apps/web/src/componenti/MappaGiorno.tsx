"use client";

import { useEffect, useRef } from "react";
import { ATTRIBUZIONE_OSM, POLITICA_REFERRER_TESSERE_OSM, URL_TESSERE_OSM, ZOOM_MASSIMO_OSM } from "../rete";
import type { DatiMappa } from "../viste/mappa";
import { useEvidenziazione } from "./Evidenziazione";

/** Testo semplice in un elemento del DOM: i nomi dei dati non vengono mai interpretati come HTML. */
function testo(righe: string[]): HTMLElement {
  const contenitore = document.createElement("div");
  for (const riga of righe) {
    const paragrafo = document.createElement("div");
    paragrafo.textContent = riga;
    contenitore.append(paragrafo);
  }
  return contenitore;
}

/**
 * Mappa del giorno con Leaflet e le tessere di OpenStreetMap: un indicatore numerato per ogni attività e una
 * linea per ogni spostamento. Disegna solo i dati ricevuti (preparati da `datiMappaGiorno`). Popup e suggerimenti
 * mostrano nomi e orari, mai gli `id` (REQ-UX-001, CA-6).
 * Passando il mouse o toccando un indicatore si evidenzia la scheda dell'attività, e viceversa (REQ-WEB-003, CA-3).
 * Leaflet si carica nel browser, dopo il primo disegno, perché usa `window`.
 */
export function MappaGiorno({ dati, etichetta }: { dati: DatiMappa; etichetta: string }) {
  const contenitore = useRef<HTMLDivElement>(null);
  const { evidenziato, evidenzia } = useEvidenziazione();
  // La mappa si disegna una volta per `dati`: il valore evidenziato e la funzione per cambiarlo passano da qui.
  const evidenziatoRef = useRef(evidenziato);
  const evidenziaRef = useRef(evidenzia);
  const aggiornaRef = useRef<() => void>(() => undefined);
  evidenziatoRef.current = evidenziato;
  evidenziaRef.current = evidenzia;

  useEffect(() => {
    let annullato = false;
    let mappa: import("leaflet").Map | undefined;
    let osservatore: ResizeObserver | undefined;

    void import("leaflet").then(({ default: L }) => {
      const nodo = contenitore.current;
      if (annullato || nodo === null) return;
      // Con `prefers-reduced-motion` la mappa non anima zoom e dissolvenze (REQ-UX-001, CA-7).
      const movimentoRidotto = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
      mappa = L.map(nodo, {
        scrollWheelZoom: false,
        zoomAnimation: !movimentoRidotto,
        fadeAnimation: !movimentoRidotto,
        markerZoomAnimation: !movimentoRidotto,
      });
      L.tileLayer(URL_TESSERE_OSM, {
        attribution: ATTRIBUZIONE_OSM,
        maxZoom: ZOOM_MASSIMO_OSM,
        referrerPolicy: POLITICA_REFERRER_TESSERE_OSM,
      }).addTo(mappa);

      const punti: [number, number][] = [];
      const indicatori = new Map<string, import("leaflet").Marker>();
      for (const linea of dati.linee) {
        const tratta: [number, number][] = [
          [linea.da.lat, linea.da.lon],
          [linea.a.lat, linea.a.lon],
        ];
        punti.push(...tratta);
        L.polyline(tratta, { className: "linea-spostamento", weight: 4, opacity: 0.8 })
          .bindTooltip(testo([linea.orario, `${linea.da.nome} → ${linea.a.nome}`, linea.mezzo]))
          .addTo(mappa);
      }
      for (const indicatore of dati.indicatori) {
        punti.push([indicatore.lat, indicatore.lon]);
        const icona = L.divIcon({
          className: "indicatore",
          html: `<span>${indicatore.numero}</span>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -15],
        });
        const marcatore = L.marker([indicatore.lat, indicatore.lon], {
          icon: icona,
          title: `${indicatore.numero}. ${indicatore.attivita}`,
          alt: `${indicatore.numero}. ${indicatore.attivita}`,
          zIndexOffset: 1000 - indicatore.numero,
        })
          .bindPopup(
            testo([`${indicatore.numero}. ${indicatore.attivita}`, indicatore.orario, indicatore.nome]),
          )
          .on("mouseover", () => evidenziaRef.current(indicatore.elementoId))
          .on("mouseout", () => evidenziaRef.current(null))
          .on("click", () => evidenziaRef.current(indicatore.elementoId))
          .addTo(mappa);
        indicatori.set(indicatore.elementoId, marcatore);
      }
      mappa.on("click", () => evidenziaRef.current(null));
      aggiornaRef.current = () => {
        for (const [elementoId, marcatore] of indicatori) {
          const acceso = elementoId === evidenziatoRef.current;
          const nodo = marcatore.getElement();
          if (acceso) nodo?.setAttribute("data-evidenziato", "si");
          else nodo?.removeAttribute("data-evidenziato");
          marcatore.setZIndexOffset(acceso ? 2000 : 1000 - (dati.indicatori.find((i) => i.elementoId === elementoId)?.numero ?? 0));
        }
      };
      aggiornaRef.current();

      const inquadra = (destinazione: import("leaflet").Map): void => {
        if (punti.length === 0) {
          // Non succede nella web app: senza punti la pagina non mostra la mappa (vedi SezioneMappa).
          destinazione.fitWorld();
        } else if (punti.length === 1 && punti[0] !== undefined) {
          destinazione.setView(punti[0], 15);
        } else {
          destinazione.fitBounds(L.latLngBounds(punti), { padding: [40, 40] });
        }
      };
      inquadra(mappa);

      // Se la mappa nasce in un contenitore ancora senza dimensioni (pagina nascosta o non ancora impaginata),
      // l'inquadratura si rifà appena il contenitore ha una dimensione vera.
      let inquadrata = nodo.clientWidth > 0 && nodo.clientHeight > 0;
      osservatore = new ResizeObserver(() => {
        if (mappa === undefined) return;
        mappa.invalidateSize();
        if (!inquadrata && nodo.clientWidth > 0 && nodo.clientHeight > 0) {
          inquadrata = true;
          inquadra(mappa);
        }
      });
      osservatore.observe(nodo);
    });

    return () => {
      annullato = true;
      aggiornaRef.current = () => undefined;
      osservatore?.disconnect();
      mappa?.remove();
    };
  }, [dati]);

  useEffect(() => {
    aggiornaRef.current();
  }, [evidenziato]);

  return (
    <div
      ref={contenitore}
      className="mappa"
      role="region"
      aria-label={etichetta}
      data-indicatori={dati.indicatori.length}
      data-linee={dati.linee.length}
    />
  );
}
