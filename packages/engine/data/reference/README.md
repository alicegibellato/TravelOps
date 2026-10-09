# Dati di riferimento

Trascrizione in JSON di `docs/requirements/dati-di-riferimento.md`. Sono dati inventati per la demo e per i test: i nomi dei luoghi sono reali, orari e tempi no. Se il documento cambia, questi file vanno aggiornati con una revisione dei requisiti.

| File | Contenuto | Sezione del documento |
| --- | --- | --- |
| `catalogo.json` | Zone, luoghi con orari di apertura, attività | §2 |
| `contesto.json` | Tempi di percorrenza, previsioni meteo (vuote: tutto sereno), chiusure straordinarie (nessuna) | §3 |
| `versione-1.json` | Viaggio `TRIP-GARDA` con l'itinerario di partenza | §1, §4 |
| `variante-v-irr.json` | Versione 1 con `D3-E2` irrinunciabile | §5 |
| `variante-v-fisso.json` | Versione 1 con `D2-E4` a orario fisso | §5 |
| `variante-v-volo.json` | Versione 1 con il volo di ritorno `D3-E8`, `D3-E9` | §5 |
| `scenari-imprevisti.json` | Scenari S1–S8: itinerario di partenza e imprevisto | §6 |
| `scenari-modifiche.json` | Scenari M1–M6: itinerario di partenza e modifica richiesta | §7 |
| `proposta-p-s1.json` | Proposta attesa per lo scenario S1 | §8 |

Negli scenari, il campo `itinerario` vale `versione-1`, `V-IRR`, `V-FISSO` o `V-VOLO`.

Nella proposta P-S1 la `spiegazione` è un segnaposto: il testo vero lo produce REQ-REPLAN-002 e i confronti riguardano modifiche, orari ed esito.

Formati: date `AAAA-MM-GG`, orari `HH:mm`, durate e tempi in minuti. I tipi sono in `src/model/index.ts`.
