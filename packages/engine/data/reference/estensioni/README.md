# Dati di riferimento aggiunti (ondata 2)

Dati aggiunti da REQ-CAT-001 (`docs/requirements/dati-di-riferimento-estensioni.md`). I file della cartella superiore non cambiano: questi si usano solo nei test e nelle funzioni dell'ondata 2, così i dati e i conteggi dell'ondata 1 restano validi.

| File | Contenuto | Fonte |
| --- | --- | --- |
| `catalogo-esteso.json` | Il catalogo di riferimento con i campi della §7.3: stili, intensità, costo, adatta ai bambini, accessibile e descrizione breve delle 8 attività; origine `riferimento` e orari verificati dei luoghi; costo indicativo dei ristoranti. Zone, luoghi e attività hanno gli stessi `id` e gli stessi dati di `../catalogo.json`. | `modello-dominio-estensioni.md` §7.3, `dati-di-riferimento-estensioni.md` §8.1 |
| `osm-esempi-orari.json` | Luoghi OpenStreetMap registrati nel formato di Overpass, con valori di `opening_hours` leggibili (fasce multiple, giorni chiusi, `24/7`, oltre la mezzanotte, regole aggiuntive, festivi) e non leggibili (stagionali, alba e tramonto, testo libero), più un luogo senza orari. Identificativi, nomi e coordinate sono illustrativi. | REQ-CAT-001 CA-3 |

Il catalogo esteso si carica con `caricaCatalogo` (usa solo tipi di luogo e categorie dell'ondata 1) e con `caricaCatalogoEsteso`.
