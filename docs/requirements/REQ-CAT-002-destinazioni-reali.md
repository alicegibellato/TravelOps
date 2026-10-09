# REQ-CAT-002 — Destinazioni reali e istantanee

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | Nuovo |
| Dipende da | REQ-CAT-001 (ST-CAT-001), REQ-DATA-001 (ST-DATA-001) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-CAT-002`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.5b |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Obiettivo

Costruire il catalogo di qualsiasi destinazione reale dalle fonti della §5.3 e salvarlo come istantanea (§7.8).

## Funzionalità

- Pacchetto `packages/sources` (fuori dal motore) con un'interfaccia unica "sorgente di destinazioni" e due realizzazioni: **reale** (fonti della §5.3) e **registrata** (legge istantanee e risposte salvate: per i test e per lavorare senza rete).
- **Ricerca della destinazione** con suggerimenti mentre si scrive (Nominatim, con attesa di almeno 300 ms tra una battuta e la ricerca e massimo 1 richiesta al secondo).
- **Costruzione della destinazione:** area dalla ricerca → luoghi con Overpass entro circa 60 minuti dal centro → classificazione con le regole di REQ-CAT-001 → selezione delle migliori attività per stile (prima quelle con pagina Wikipedia o Wikidata, poi con orari verificati, poi più vicine al centro) fino a un massimo di 120 attività → descrizioni da Wikipedia o Wikivoyage (in italiano, altrimenti in inglese) → immagini da Wikimedia Commons con licenza → tempi di percorrenza con OSRM (a piedi e in auto) tra le coppie utili; per i mezzi pubblici una **stima** dichiarata (tempo in auto × 1,5 + 10 minuti) marcata come stima → controllo dei minimi della §8.1 → istantanea.
- Avanzamento mostrato al viaggiatore ("Cerco i luoghi… Scelgo i ristoranti… Calcolo i percorsi…"); obiettivo meno di 60 secondi; dopo la prima volta la destinazione è immediata.
- Se la destinazione non raggiunge i minimi: messaggio gentile e proposta di 2–3 destinazioni vicine più grandi.
- **Sorprendimi:** un elenco configurabile di 20 destinazioni candidate (in `packages/sources/candidates.json`, con stili prevalenti e mesi consigliati) ordinate col punteggio del profilo; si propongono le prime 3 al viaggiatore, che ne sceglie una.
- L'AI può solo riscrivere la descrizione breve di un luogo in italiano a partire dal testo della fonte; non aggiunge luoghi e non cambia orari, coordinate o classificazione.
- Le 3 istantanee precaricate (§8.1) nel repository; il primo avvio le carica nel database.
- Attribuzioni: "© OpenStreetMap contributors" sulla mappa e nei dettagli; autore e licenza di ogni immagine; fonte di ogni descrizione.

## Riferimento: 5.3 Fonti di dati reali senza chiavi a pagamento

Riportato dalla CR-001 perché fa parte di questo requisito.

| Dato | Fonte | Regole d'uso da rispettare |
|---|---|---|
| Ricerca della destinazione e area | Nominatim (OpenStreetMap) | massimo 1 richiesta al secondo, User-Agent identificativo, risultati in cache ([regole](https://operations.osmfoundation.org/policies/nominatim/)) |
| Luoghi, tipi, coordinate, orari di apertura (`opening_hours`), opzioni alimentari, accessibilità (`wheelchair`) | Overpass API (OpenStreetMap) | uso moderato, query limitate all'area ([wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)) |
| Descrizioni | Wikipedia e Wikivoyage in italiano (in inglese se manca), API pubbliche | citazione della fonte |
| Immagini | Wikimedia Commons | licenza e autore salvati e mostrati |
| Tempi di percorrenza a piedi e in auto | OSRM (server dimostrativo pubblico o istanza propria) | uso leggero, in cache ([regole del server dimostrativo](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)) |
| Licenza dei dati OSM | ODbL | attribuzione "© OpenStreetMap contributors" visibile sulla mappa e nei dettagli |

Da qui l'elenco degli imprevisti gestiti (§7.4): oltre a meteo, ritardo, chiusura e cancellazione già presenti, si aggiungono volo o coincidenza persi, problema di salute o infortunio, sciopero dei mezzi, bagaglio smarrito, documenti smarriti o rubati, stanchezza; e tra le richieste del viaggiatore "resto più giorni" o "riparto prima".

---

## Criteri di accettazione

- **CA-1** Con la sorgente registrata, la costruzione di Garda, Roma e Dolomiti dà esattamente le istantanee nel repository, con un test deterministico senza rete.
- **CA-2** Ogni istantanea rispetta i minimi di dati-di-riferimento-estensioni.md §8.1.
- **CA-3** Il generatore di REQ-PLAN-001 produce bozze senza problemi bloccanti sulle 3 istantanee con i profili PR-1, PR-2 e PR-3.
- **CA-4** Il limite di 1 richiesta al secondo verso Nominatim è rispettato, verificato con un orologio finto.
- **CA-5** Una destinazione con pochi luoghi dà un messaggio gentile con 2 o 3 destinazioni vicine suggerite.
- **CA-6** Ogni luogo di un'istantanea ha origine osm e un identificativo OpenStreetMap; ogni immagine ha licenza e autore.
- **CA-7** Nessuna chiamata di rete nei test automatici.
- **CA-8** Con la rete, la costruzione di Lisbona (profilo PR-5) termina in meno di 60 secondi e rispetta i minimi, verificato nel collaudo.

## Campi per il plugin

- **Sintesi** (`--summary`): Qualsiasi destinazione reale costruita da OpenStreetMap, Wikipedia, Wikivoyage, Wikimedia Commons e OSRM e salvata come istantanea immutabile; tre destinazioni precaricate nel repository per la demo senza rete; Sorprendimi da un elenco di destinazioni candidate.
- **Criteri** (`--acceptance`): CA-1…CA-8.
- **Fuori perimetro** (`--non-goal`): Prezzi reali, disponibilità e prenotazioni. Orari reali dei mezzi pubblici (solo stime dichiarate). Più destinazioni nello stesso viaggio.
- **Vincoli** (`--constraint`): Nessun segreto nel codice o nei log. Le chiamate di rete stanno solo in packages/sources, mai nel motore. Rispetto delle regole d'uso dei servizi: al massimo 1 richiesta al secondo a Nominatim, User-Agent che identifica TravelOps, cache obbligatoria, attribuzione visibile (© OpenStreetMap contributors, licenze delle immagini). L'AI può solo riscrivere la descrizione breve di un luogo a partire dal testo della fonte; non aggiunge luoghi e non cambia orari, coordinate o classificazione. Un'istantanea non cambia mai: aggiornare una destinazione crea una nuova istantanea.
- **Integrazioni** (`--integration`): Nominatim (OpenStreetMap), Overpass API (OpenStreetMap), Wikipedia e Wikivoyage, Wikimedia Commons, OSRM.
- **Percorsi** (`--write-path`): `packages/sources`, `apps/web`, `package.json`, `package-lock.json`, `.gitignore`, `docs`, `evidence`.
