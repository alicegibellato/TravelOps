# Prove di consegna: ST-INTEG-001

## Cosa è stato chiesto

REQ-INTEG-001 "Servizi esterni reali con adattatori". Story `ST-INTEG-001`, con questi criteri:

1. porte e adattatori per meteo (Open-Meteo, senza chiave), geocoding e percorsi (Nominatim e OSRM di `packages/sources`), voli (adattatore finto più link di ricerca, interfaccia pronta per un fornitore reale) ed eventi (adattatore finto con interfaccia) (CA-1);
2. ogni servizio ha la modalità finto o reale scelta da ambiente; il predefinito è finto nei test e in e2e (CA-2);
3. cache e timeout configurabili; un errore di rete degrada in modo esplicito, senza bloccare l'app (CA-3);
4. il meteo entra nel controllo di fattibilità e nelle viste dell'itinerario con la previsione per giorno (CA-4);
5. test con adattatori finti e risposte registrate su modalità, cache, timeout, errore di rete e meteo nella fattibilità; nessun test chiama la rete (CA-5).

## Perimetro ed esclusioni

- **Comprende:**
  - le porte e gli adattatori in `packages/sources/src/servizi` (risultato comune, cache con TTL, configurazione da ambiente, meteo, geocoding, percorsi, voli, eventi, composizione);
  - `conPrevisioni` nel motore (`packages/engine/src/context`), che aggiunge previsioni esterne a una sorgente di contesto senza cambiare `controllaFattibilita`;
  - nella web app: servizi del processo, meteo del viaggio, componente `PrevisioneGiorno`, previsione nelle viste viaggio e giorno delle versioni e nella vista viaggio, meteo nella fattibilità delle versioni, sorgente reale delle destinazioni con `TRAVELOPS_GEOCODING=reale`;
  - `apps/web/.env.example` e `docs/servizi-esterni.md`.
- **Esclude:** fornitori reali di voli ed eventi (solo interfacce `ProviderVoli` e `ProviderEventi`); strumento `leggi_meteo` degli agenti, rimandato a REQ-ORCH-002 (insieme a instradamento e orchestrazione); monitoraggio periodico (REQ-MONITOR-001); `.sdlc/`.
- **Lasciato fuori di proposito:** nessuna nuova dipendenza; nessuna modifica a `PaginaBozza`, `/pianifica`, `/oggi`, Demo; la vista giorno dei viaggi di riferimento (`/viaggi/<chiave>/giorni/<data>`) resta statica (generata alla build) e non mostra la previsione.
- **Deviazioni:** nessuna.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Risultato comune (disponibile o non disponibile con motivo e messaggio), tempo massimo con `AbortSignal` | `packages/sources/src/servizi/risultato.ts` |
| Cache in memoria con TTL, chiamate uguali condivise, errori mai in cache | `packages/sources/src/servizi/cache.ts` |
| Configurazione da ambiente con predefiniti e avvisi | `packages/sources/src/servizi/configurazione.ts` |
| Porta Meteo, Open-Meteo, mappatura WMO, adattatore finto | `packages/sources/src/servizi/meteo.ts` |
| Porte Geocoding e Percorsi; Nominatim (sorgente reale esistente), OSRM (cliente esistente), finti sulle istantanee | `packages/sources/src/servizi/percorsi.ts` |
| Porta Voli, `ProviderVoli`, finto, link di ricerca del motore | `packages/sources/src/servizi/voli.ts` |
| Porta Eventi, `ProviderEventi`, finto | `packages/sources/src/servizi/eventi.ts` |
| Meteo di un viaggio: richieste per zona, previsioni per il motore, previsione per giorno, avviso se manca | `packages/sources/src/servizi/viaggio.ts` |
| Composizione finto o reale per servizio con la cache di ciascuno | `packages/sources/src/servizi/registro.ts`, `index.ts` |
| Esportazioni del pacchetto (anche `OSRM_AUTO`, `OSRM_PIEDI`) | `packages/sources/src/index.ts` |
| `conPrevisioni` | `packages/engine/src/context/sorgente-memoria.ts`, `index.ts` |
| Servizi del processo, meteo del viaggio e della versione | `apps/web/src/servizi/esterni.ts`, `meteo-viaggio.ts` |
| Previsione sintetica del giorno (solo token del design system) | `apps/web/src/componenti/PrevisioneGiorno.tsx`, `apps/web/app/globals.css` |
| Previsione nelle viste | `apps/web/src/componenti/VistaViaggio.tsx`, `VistaGiorno.tsx`, `Contenuti.tsx`, `ContenutiStato.tsx` |
| Pagine che chiedono il meteo | `apps/web/app/viaggi/[viaggio]/page.tsx`, `app/versioni/[numero]/page.tsx`, `app/versioni/[numero]/giorni/[data]/page.tsx` |
| Meteo nella fattibilità delle versioni | `apps/web/src/viste/versioni.ts` |
| Sorgente delle destinazioni reale o registrata da ambiente | `apps/web/src/destinazioni/sorgente.ts` |
| Servizi sempre finti nelle prove end-to-end | `apps/web/e2e/supporto.ts` |
| Documentazione | `docs/servizi-esterni.md`, `apps/web/.env.example` |
| Test | `packages/sources/test/servizi/*`, `packages/engine/test/context/con-previsioni.test.ts`, `apps/web/test/integ001-meteo.test.tsx` |
| Prove di consegna | `evidence/ST-INTEG-001.md` |

## Perché

### Dipendenze

- ST-CAT-002: client Nominatim e OSRM, `ClienteFonti`, `creaClienteHttp`, `creaSorgenteReale`, sorgente registrata.
- REQ-FEAS-001: `controllaFattibilita` e `SorgenteDatiContesto`, che già trattano `METEO_AVVERSO` come avviso.

### Scelte

- **Porte nel pacchetto che ha la rete.** `packages/sources` è già l'unico posto con chiamate di rete; i tipi del dominio (`CondizioneMeteo`, `Coordinate`) vengono dal motore. Il motore resta puro e senza rete.
- **Il controllo di fattibilità non cambia.** È sincrono: si chiede il meteo prima (`leggiMeteoViaggio`, una richiesta per zona su tutto il periodo) e le fasce non serene diventano `PrevisioneMeteo` aggiunte alla sorgente con `conPrevisioni`. Così il motore resta deterministico e il meteo è un dato in ingresso.
- **Nessuna eccezione dalle porte.** Ogni porta risponde con `RisultatoServizio`: errore di rete, stato 5xx, risposta non riconosciuta, date fuori orizzonte (4xx), tempo scaduto e annullamento diventano «non disponibile» con motivo e frase per il viaggiatore («Meteo non disponibile: il servizio non risponde in tempo»). Il tempo massimo vale anche per un adattatore che ignora l'`AbortSignal`.
- **Predefinito finto.** Senza variabili tutti i servizi sono finti; un valore non valido torna al predefinito e finisce in `avvisi`. Le prove end-to-end impostano comunque le cinque variabili a `finto`. Il meteo finto è deterministico e fatto solo di sereno e nuvoloso, così non cambia gli esiti dei flussi esistenti; la pioggia si ottiene solo da una condizione scelta dal test.
- **Il finto si dichiara.** La previsione finta mostra «(esempio)»; voli ed eventi finti hanno `esempio: true`.
- **Voli ed eventi reali senza fornitore.** Con `reale` e nessun provider iniettato il risultato è «non disponibile» (resta il link di ricerca voli): l'interfaccia è pronta, il fornitore si sceglierà dopo.
- **Geocoding segue i percorsi.** `TRAVELOPS_GEOCODING` ha come predefinito il valore di `TRAVELOPS_PERCORSI`. Nella web app la modalità reale del geocoding sceglie la sorgente reale delle destinazioni (ricerca e costruzione), una per processo per tenere il ritmo di 1 richiesta al secondo verso Nominatim.
- **Strumento agenti rimandato.** Lo strumento `leggi_meteo` degli agenti è rimandato a REQ-ORCH-002: in questa storia `packages/agents` non cambia.
- **Vista viaggio e giorno delle versioni.** Sono pagine già dinamiche; la vista giorno dei viaggi di riferimento è statica e non chiama la rete alla build.

### Alternative scartate

- **Un pacchetto nuovo per le porte:** avrebbe cambiato il lockfile e i workspace per niente; `packages/sources` ha già rete, cliente HTTP e cache.
- **Rendere asincrona `controllaFattibilita` o `SorgenteDatiContesto`:** avrebbe toccato motore, ripianificazione e tutte le viste.
- **Un nuovo codice di fattibilità «meteo non disponibile»:** cambierebbe i codici del motore e i testi in italiano; il messaggio sta nella vista, accanto a ogni giorno.
- **Meteo finto con pioggia periodica:** avrebbe fatto comparire avvisi nei flussi esistenti.

## Verifica

Comandi eseguiti nella copia di lavoro (ognuno con limite di 10 minuti): `npm ci --prefer-offline`, `npm run build` (dalla radice), `npx tsc --noEmit -p tsconfig.json` in `apps/web`, `npx vitest run` in `packages/engine`, `packages/sources` e `apps/web`, `npm run e2e` (dalla radice).

- `npm run build`: riuscito. Typecheck della web app: nessun errore.
- Motore: 37 file e 721 test superati. Sorgenti: 15 file e 138 test superati, 1 saltato (la prova di rete). Agenti: 13 file e 133 test superati. Web: 84 file e 551 test superati. End-to-end: 6 file e 18 test superati con i servizi finti.
- Nuovi in questa storia: 18 test nella porta Meteo e nella cache, 17 in configurazione, composizione, percorsi, geocoding, voli ed eventi, 7 nell'integrazione con la fattibilità (sorgenti), 3 in `conPrevisioni` (motore), 11 nella web app.
- Prova opzionale verso Open-Meteo reale (`packages/sources/test/servizi/rete-reale.test.ts`): non gira di predefinito, serve `TRAVELOPS_TEST_RETE=1`. Eseguita una volta a mano: riuscita (previsione di Riva del Garda per due giorni, fasce dalle 00:00 alle 24:00 nelle condizioni del dominio). Nessun dato personale: solo coordinate e date.

Corrispondenza criteri e test:

| Criterio | Test |
| --- | --- |
| CA-1 porte e adattatori | `meteo.test` (Open-Meteo con risposta registrata `dati/open-meteo-garda.json` e fetch finto; finto deterministico), `servizi.test` (OSRM con cliente finto sul cliente di `packages/sources`, percorsi finti sulle istantanee, Nominatim tramite la sorgente reale con cliente finto, geocoding finto, voli finti con link di ricerca e provider iniettato, eventi finti e reali senza provider) |
| CA-1 mappatura WMO | `meteo.test` (codici 0, 1, 2, 3, 45, 51–57, 61–67, 80–82, 71–77, 85–86, 95, 96, 99; codici sconosciuti scartati) |
| CA-2 modalità da ambiente | `servizi.test` (configurazione: predefiniti, scelta per servizio, geocoding che segue i percorsi, valori non validi; composizione: tutto finto senza variabili e senza nessuna chiamata a `fetch`, solo il meteo reale passa da `fetch`), `integ001-meteo` (servizi finti senza ambiente, sorgente delle destinazioni registrata o reale), `e2e/supporto.ts` (le cinque variabili a `finto`) |
| CA-3 cache | `meteo.test` (entro il TTL non rifà la chiamata e lo segnala, scaduto la rifà, TTL 0 la disattiva, errori mai in cache, chiamate contemporanee condivise, numero massimo di voci), `servizi.test` (TTL da `TRAVELOPS_METEO_TTL_S`) |
| CA-3 timeout ed errori | `meteo.test` (rete, 5xx, 4xx, risposta non valida, giorni senza codice, timeout con `AbortSignal`, richiesta annullata), `servizi.test` (OSRM: rete, 5xx, nessun percorso, timeout; Nominatim che non risponde; voli con provider guasto), `integ001-meteo` (ogni giorno dice «Meteo non disponibile», la pagina si disegna) |
| CA-4 fattibilità | `fattibilita-meteo.test` (pioggia prevista sul sentiero all'aperto: avviso `METEO_AVVERSO` sull'elemento, attività al coperto senza avviso, sereno senza avvisi, meteo non disponibile uguale a nessun meteo), `con-previsioni.test` (motore), `integ001-meteo` (fattibilità delle versioni: un avviso sul sentiero, i bloccanti invariati) |
| CA-4 viste | `integ001-meteo` (una previsione per giorno nella vista viaggio, «(esempio)» con il finto, assente senza meteo, temperature e probabilità) |
| CA-5 nessuna chiamata di rete | tutti i test usano `fetch` o clienti finti e risposte registrate; l'unica prova di rete è opzionale e salta senza `TRAVELOPS_TEST_RETE=1` |

## Limiti

- Il meteo reale dipende dall'orizzonte di Open-Meteo (circa 16 giorni): oltre, il giorno risulta «non disponibile».
- La bozza (`/bozza`) non mostra la previsione e il suo controllo di fattibilità non usa ancora il meteo: il servizio della bozza costruisce il contesto da solo (`apps/web/src/bozza/servizio.ts`); basta passare `conPrevisioni` lì, fuori dal perimetro per non toccare l'area di altri.
- La vista giorno dei viaggi di riferimento e la vista Oggi non mostrano la previsione.
- Voli ed eventi reali non hanno ancora un fornitore.
- Il tempo massimo `TRAVELOPS_SERVIZI_TIMEOUT_MS` vale per meteo, percorsi, geocoding, voli ed eventi; la costruzione delle destinazioni reali conserva il limite di 60 secondi del cliente HTTP esistente.

## Collegamenti

- Requisito: REQ-INTEG-001
- Story: ST-INTEG-001
- Dipendenze: ST-CAT-002, ST-FEAS-001B
