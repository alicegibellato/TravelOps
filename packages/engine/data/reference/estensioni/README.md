# Dati di riferimento aggiunti (ondata 2)

Dati aggiunti da REQ-CAT-001 (`docs/requirements/dati-di-riferimento-estensioni.md`). I file della cartella superiore non cambiano: questi si usano solo nei test e nelle funzioni dell'ondata 2, così i dati e i conteggi dell'ondata 1 restano validi.

| File | Contenuto | Fonte |
| --- | --- | --- |
| `catalogo-esteso.json` | Il catalogo di riferimento con i campi della §7.3: stili, intensità, costo, adatta ai bambini, accessibile e descrizione breve delle 8 attività; origine `riferimento` e orari verificati dei luoghi; costo indicativo dei ristoranti. Zone, luoghi e attività hanno gli stessi `id` e gli stessi dati di `../catalogo.json`. | `modello-dominio-estensioni.md` §7.3, `dati-di-riferimento-estensioni.md` §8.1 |
| `osm-esempi-orari.json` | Luoghi OpenStreetMap registrati nel formato di Overpass, con valori di `opening_hours` leggibili (fasce multiple, giorni chiusi, `24/7`, oltre la mezzanotte, regole aggiuntive, festivi) e non leggibili (stagionali, alba e tramonto, testo libero), più un luogo senza orari. Identificativi, nomi e coordinate sono illustrativi. | REQ-CAT-001 CA-3 |
| `variante-v-bus.json` | Versione 1 con `D3-E1` in mezzi pubblici dalle 08:40 alle 10:00 (variante `V-BUS` dello scenario S11). | `dati-di-riferimento-estensioni.md` §8.4 |
| `servizi-ondata2.json` | I luoghi `NEGOZIO-RIVA` e `COMMISSARIATO-RIVA`, le attività di categoria `servizio` `A-ACQUISTI` e `A-DENUNCIA` e i quattro tempi a piedi della §8.5. Si uniscono al catalogo esteso e ai dati di contesto solo negli scenari dell'ondata 2 (S12, S13). | `dati-di-riferimento-estensioni.md` §8.5, REQ-REPLAN-004 |
| `contesto-v-bus.json` | Il tempo di 80 minuti in mezzi pubblici tra `HOTEL` e `BUONCONSIGLIO` della variante `V-BUS`, usato solo dalla ripianificazione di S11 (R-CAN-1): nei dati di contesto comuni cambierebbe S5 di REQ-REPLAN-002. | `dati-di-riferimento-estensioni.md` §8.4, REQ-REPLAN-004 |
| `scenari-imprevisti-estesi.json` | Gli imprevisti degli scenari S9–S14, con i tipi della §7.4; il campo `itinerario` vale `versione-1`, `V-VOLO` o `V-BUS`. | `dati-di-riferimento-estensioni.md` §8.4, REQ-REPLAN-003 |

Il catalogo esteso si carica con `caricaCatalogo` (usa solo tipi di luogo e categorie dell'ondata 1) e con `caricaCatalogoEsteso`.

La variante `V-BUS` cambia solo l'itinerario: il tempo di 80 minuti in mezzi pubblici tra `HOTEL` e `BUONCONSIGLIO`, che serve alla ripianificazione di S11 (R-CAN-1), non è qui. Gli scenari S9–S14 servono al calcolo dell'impatto (REQ-REPLAN-003) e alla ripianificazione (REQ-REPLAN-004); i risultati della ripianificazione di S12–S14 sono fissati nel contratto di ST-REPLAN-004 (`contract-ST-REPLAN-004-implementation`).
