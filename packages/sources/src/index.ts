/**
 * Pacchetto @travelops/sources: le sorgenti delle destinazioni di TravelOps (REQ-CAT-002).
 *
 * Qui stanno, fuori dal motore, il formato e la lettura validata delle istantanee (§7.8), il controllo dei minimi
 * (§8.1), l'interfaccia unica "sorgente di destinazioni" con la realizzazione registrata (senza rete) e il contratto
 * della realizzazione reale (ST-CAT-002). Le chiamate di rete, quando ci saranno, staranno solo in questo pacchetto.
 *
 * La posizione della cartella `snapshots/` del pacchetto è in un punto d'ingresso a parte,
 * `@travelops/sources/pacchetto`, solo per Node.js: i bundler (Next.js) non devono vederla.
 */
export {
  ATTRIBUZIONE_OSM,
  comeIstantaneaCatalogo,
  FORMATO_ID_ISTANTANEA,
  riepilogoIstantanea,
  VERSIONE_FORMATO,
  type AreaDestinazione,
  type AttivitaIstantanea,
  type FonteIstantaneaDestinazione,
  type ImmagineIstantanea,
  type IstantaneaDestinazione,
  type RiepilogoIstantanea,
  type StileScarso,
  type TempoPercorrenzaIstantanea,
} from "./formato.js";
export {
  ErroreIstantanea,
  leggiAreaDestinazione,
  leggiIstantanea,
  leggiIstantaneaOppureErrore,
  type CodiceProblema,
  type OpzioniLettura,
  type ProblemaIstantanea,
  type RisultatoLetturaIstantanea,
} from "./lettore.js";
export {
  adattoAlPasto,
  controllaMinimi,
  coppieUsabili,
  FINESTRE_PASTI,
  MINIMI,
  type AvvisoMinimo,
  type CodiceAvvisoMinimo,
  type CodiceMinimo,
  type ConteggiMinimi,
  type EsitoMinimi,
  type MancanzaMinimo,
} from "./minimi.js";
export {
  LIMITE_RICERCA_PREDEFINITO,
  MESSAGGI_AVANZAMENTO,
  PASSI_COSTRUZIONE,
  SERVIZI_FONTE,
  type Avanzamento,
  type ClienteFonti,
  type CreaSorgenteReale,
  type EsitoCostruzione,
  type OpzioniCostruzione,
  type OpzioniRicerca,
  type OpzioniSorgenteReale,
  type Orologio,
  type PassoCostruzione,
  type RichiestaFonte,
  type RispostaFonte,
  type ServizioFonte,
  type SorgenteDestinazioni,
} from "./sorgente.js";
export {
  ErroreCartellaIstantanee,
  leggiCartellaIstantanee,
  NOME_CARTELLA_ISTANTANEE,
  type IstantaneaInCartella,
  type ProblemaFile,
} from "./cartella.js";
export {
  creaClienteRegistrato,
  creaSorgenteRegistrata,
  creaSorgenteRegistrataDaFile,
  ErroreRegistrazioni,
  ErroreRispostaNonRegistrata,
  leggiFileRegistrazioni,
  leggiRegistrazioni,
  LUNGHEZZA_MINIMA_RICERCA,
  normalizzaRicerca,
  VERSIONE_REGISTRAZIONI,
  type OpzioniSorgenteRegistrata,
  type RicercaRegistrata,
  type Registrazioni,
  type RispostaRegistrata,
} from "./registrata.js";
export {
  areaDaNominatim,
  creaSorgenteReale,
  INTERVALLO_NOMINATIM_MS,
  NOMINATIM_RICERCA,
  richiestaNominatim,
} from "./reale.js";
export {
  ATTIVITA_SCELTE,
  BLOCCO_OSRM,
  costruisciDaFonti,
  distanzaKm,
  fasciaAlloggio,
  fraseBreve,
  INTERVALLO_FONTI_MS,
  MASSIMO_ATTIVITA,
  MASSIMO_MINUTI_A_PIEDI,
  queryLocalitaVicine,
  queryOverpass,
  RAGGIO_ARRIVO_KM,
  RAGGIO_KM,
  RAGGIO_VICINO_KM,
  Ritmo,
  SERVER_OVERPASS,
  stimaMezziPubblici,
  TAG_USATI,
  type ContestoCostruzione,
} from "./costruzione.js";
export {
  DATA_ISTANTANEE_PRECARICATE,
  DESTINAZIONI_PRECARICATE,
  destinazionePrecaricata,
  type DestinazionePrecaricata,
} from "./precaricate.js";
export { creaClienteHttp, creaClienteRegistratore, type ClienteRegistratore, type OpzioniClienteHttp } from "./cliente-http.js";
