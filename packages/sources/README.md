# @travelops/sources

Le sorgenti delle destinazioni di TravelOps (REQ-CAT-002), fuori dal motore. Il motore non sa da dove vengono i dati: riceve un'istantanea come un normale catalogo esteso e i suoi tempi di percorrenza come dati di contesto (`modello-dominio-estensioni.md` §7.8).

Questo pacchetto contiene (ST-CAT-002A):

- il **formato dell'istantanea** e il suo **lettore validato** (`leggiIstantanea`);
- il **controllo dei minimi** della §8.1 di `dati-di-riferimento-estensioni.md` (`controllaMinimi`);
- l'**interfaccia unica** `SorgenteDestinazioni` e la **realizzazione registrata**, che legge istantanee e risposte salvate senza rete;
- il **contratto della realizzazione reale** (`CreaSorgenteReale`, `ClienteFonti`, `Orologio`), che ST-CAT-002 realizzerà con Nominatim, Overpass, Wikipedia e Wikivoyage, Wikimedia Commons e OSRM;
- la cartella `snapshots/` delle istantanee precaricate (oggi vuota: le 3 destinazioni della §8.1 arrivano con ST-CAT-002).

Nessuna dipendenza esterna: solo `@travelops/engine` (tipi, valori ammessi e `caricaCatalogoEsteso`) e i moduli di Node.js per leggere i file. Nessuna chiamata di rete.

## Formato dell'istantanea (versione 1)

Un file JSON, `<id>.json`. È un `IstantaneaCatalogo` del motore con alcuni campi in più, tutti definiti in `src/formato.ts`.

| Campo | Obbligatorio | Contenuto |
| --- | --- | --- |
| `formato` | sì | `1` |
| `id` | sì | lettere minuscole, cifre e trattini (`roma-2026-10-09`); è anche il nome del file e la chiave nel database |
| `destinazione` | sì | nome da mostrare (`Lago di Garda (Riva del Garda e dintorni)`) |
| `area` | sì | l'area trovata dalla ricerca: `id` stabile (`osm:relation/41485`), `nome`, `descrizione`, `centro` `{ lat, lon }`, `osmId` facoltativo |
| `dataCreazione` | sì | `AAAA-MM-GG`, un dato dell'istantanea (mai letto dall'orologio) |
| `fonti` | sì, almeno una | `{ nome, attribuzione, licenza? }`; con dei luoghi serve una fonte con l'attribuzione `© OpenStreetMap contributors` |
| `stiliScarsi` | no | `{ stile, motivo }` per gli stili con meno di 2 attività (§8.1) |
| `zone`, `luoghi`, `attivita` | sì | il catalogo esteso, validato con `caricaCatalogoEsteso` del motore (REQ-ITIN-001, REQ-CAT-001) |
| `tempiPercorrenza` | sì | `{ da, a, mezzo, minuti, stima? }`, validi nei due sensi |

Regole in più rispetto al catalogo del motore:

- ogni **luogo** ha `origine: "osm"` e un `osmId` (`node/…`, `way/…`, `relation/…`) (CA-6);
- ogni **immagine** di un'attività ha, oltre a `percorso` e `attribuzione`, `autore` e `licenza` (e facoltativi `urlLicenza`, `urlFonte`) (CA-6);
- i **tempi**: luoghi esistenti e diversi, mezzo ammesso, minuti interi ≥ 0, una sola voce per coppia e mezzo; i tempi con i **mezzi pubblici** sono sempre stime dichiarate (`"stima": true`, tempo in auto × 1,5 + 10 minuti);
- un'istantanea **non cambia mai**: aggiornare una destinazione crea un'istantanea nuova con un `id` nuovo.

## Minimi (§8.1)

`controllaMinimi(istantanea)` restituisce `{ rispettati, mancanze, avvisi, conteggi }`, con un messaggio in italiano per ogni mancanza. `leggiIstantanea` li controlla di suo (con `{ minimi: false }` legge solo la forma).

| Minimo | Regola esatta | Codice |
| --- | --- | --- |
| almeno 15 attività | attività con categoria diversa da `pasto` e `servizio` | `ATTIVITA_INSUFFICIENTI` |
| almeno 2 per stile | per ciascuno dei 7 stili; uno stile dichiarato in `stiliScarsi` diventa un avviso | `STILE_INSUFFICIENTE` |
| 3 ristoranti a pranzo e cena | almeno 3 ristoranti aperti a pranzo e almeno 3 aperti a cena: sempre aperti, o con una fascia che copre almeno 60 minuti della finestra 12:00–15:00 (pranzo) o 19:00–22:30 (cena) in almeno un giorno | `RISTORANTI_PRANZO_INSUFFICIENTI`, `RISTORANTI_CENA_INSUFFICIENTI` |
| uno vegetariano | almeno un ristorante con `opzioniAlimentari` `vegetariano` | `RISTORANTE_VEGETARIANO_MANCANTE` |
| uno senza glutine "se esiste nei dati" | l'istantanea non può sapere se esiste: se manca è solo un avviso | avviso `RISTORANTE_SENZA_GLUTINE_MANCANTE` |
| 2 alloggi di fascia diversa | almeno 2 valori diversi di `costoIndicativo` tra gli alloggi | `ALLOGGI_INSUFFICIENTI` |
| farmacia, ospedale, arrivo | almeno un luogo `farmacia`, uno `ospedale`, una `stazione` o un `aeroporto` | `FARMACIA_MANCANTE`, `OSPEDALE_MANCANTE`, `ARRIVO_MANCANTE` |
| tempi per le coppie usabili | almeno un tempo (qualsiasi mezzo) per ogni coppia di `coppieUsabili`: tutte le coppie tra luoghi con un'attività non di servizio (ristoranti compresi) e alloggi, più ogni alloggio con ogni stazione e aeroporto | `TEMPI_MANCANTI` |

## Interfaccia della sorgente

```ts
interface SorgenteDestinazioni {
  readonly tipo: "reale" | "registrata";
  cercaDestinazioni(testo: string, opzioni?: { limite?: number; segnale?: AbortSignal }): Promise<AreaDestinazione[]>;
  costruisciIstantanea(area: AreaDestinazione, opzioni?: { avanzamento?: (a: Avanzamento) => void; segnale?: AbortSignal }): Promise<EsitoCostruzione>;
  leggiIstantanea(id: string): Promise<IstantaneaDestinazione | null>;
  elencaIstantanee(): Promise<RiepilogoIstantanea[]>;
}

type EsitoCostruzione =
  | { ok: true; istantanea: IstantaneaDestinazione }
  | { ok: false; motivo: "minimi_non_rispettati"; messaggio: string; mancanze: MancanzaMinimo[]; alternative: AreaDestinazione[] }
  | { ok: false; motivo: "non_disponibile"; messaggio: string };
```

L'avanzamento passa per `PASSI_COSTRUZIONE` (`luoghi`, `classificazione`, `ristoranti`, `descrizioni`, `immagini`, `percorsi`, `minimi`) con i messaggi di `MESSAGGI_AVANZAMENTO` ("Cerco i luoghi…", "Scelgo i ristoranti…", "Calcolo i percorsi…").

### Realizzazione registrata

- `creaSorgenteRegistrata({ istantanee, ricerche? })` e `creaSorgenteRegistrataDaFile(cartellaIstantanee, fileRegistrazioni?)`.
- Ricerca: prima le ricerche registrate (testo normalizzato: minuscole, senza accenti, spazi singoli), poi le aree delle istantanee che contengono il testo; meno di 2 caratteri non danno risultati.
- Costruzione: l'istantanea più recente dell'area (data di creazione, poi `id`), con tutti i passi di avanzamento; un'area sconosciuta dà `non_disponibile`; un'istantanea sotto i minimi dà `minimi_non_rispettati` con fino a 3 altre destinazioni registrate, le più vicine.
- Restituisce sempre copie: chi le riceve non può cambiare le istantanee della sorgente.
- File di registrazioni (`leggiRegistrazioni`): `{ "formato": 1, "ricerche": [{ "testo", "risultati": [area…] }], "risposte": [{ "richiesta": { servizio, url, metodo?, corpo? }, "risposta": { stato, corpo } }] }`.
- `creaClienteRegistrato(risposte)` è un `ClienteFonti` che risponde con le risposte salvate (stesso servizio, metodo, indirizzo e corpo) e rifiuta ogni richiesta non registrata con `ErroreRispostaNonRegistrata`: serve a far girare la costruzione reale senza rete.

### Contratto della realizzazione reale (ST-CAT-002)

```ts
type CreaSorgenteReale = (opzioni: {
  cliente: ClienteFonti;          // HTTP con User-Agent e cache; nei test creaClienteRegistrato
  userAgent: string;              // identifica TravelOps (Nominatim)
  orologio: Orologio;             // { adesso(): number; attendi(ms): Promise<void> }, finto nei test di CA-4
  istantaneeNote?: (areaId: string) => IstantaneaDestinazione | null;
  dataCreazione: () => string;    // AAAA-MM-GG delle istantanee nuove
}) => SorgenteDestinazioni;
```

## Istantanee del repository

`leggiCartellaIstantanee(cartella)` legge e valida (minimi compresi) tutti i file `.json` della cartella, in ordine di nome; il nome di ogni file deve essere `<id>.json`. Una cartella assente o senza `.json` dà un elenco vuoto; un file non valido solleva `ErroreCartellaIstantanee` con tutti i problemi. `cartellaIstantaneeDelPacchetto()` (da `@travelops/sources/pacchetto`, solo Node.js) restituisce `packages/sources/snapshots`; la web app la calcola da sé (Turbopack non deve vedere `import.meta.url`) e al primo avvio carica le istantanee nel database (`apps/web/src/stato/istantanee.ts`).

## Test

`npm test --workspace @travelops/sources`. L'istantanea di prova `test/dati/prova-dato-di-test.json` è un **dato di test** (un borgo inventato, 15 luoghi, 18 attività, 124 tempi) che rispetta tutti i minimi; non sta in `snapshots/` e non è una delle destinazioni precaricate.
