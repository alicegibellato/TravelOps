# Prove di consegna: ST-INTEG-001-FIX-TB-REAL-004

## Cosa è stato chiesto

REQ-INTEG-001 (CA-3/CA-4), fix di `ST-INTEG-001`. Caso di collaudo TB-REAL-004: con `TRAVELOPS_METEO_URL` irraggiungibile le pagine degradano con «Meteo non disponibile», ma nel log del server non c'era nessun avviso.

Causa: `meteoDelViaggio` (`apps/web/src/servizi/meteo-viaggio.ts`) restituiva il messaggio di degrado senza scrivere nulla, né quando il servizio rispondeva «non disponibile» né quando sollevava un errore.

## Cosa è stato fatto

| Punto | Dove | Come |
|---|---|---|
| Avviso nel log | `apps/web/src/servizi/meteo-viaggio.ts` (`meteoDelViaggio`) | Se il meteo ha un avviso, o la lettura solleva un errore, scrive una riga `TravelOps: meteo non disponibile (...)` con il solo messaggio già pensato per l'utente: mai indirizzi, chiavi o dettagli dell'errore. |
| Destinazione sostituibile | stesso file (`RegistraAvviso`) | La scrittura è un parametro con `console.warn` come predefinito: nessun valore fisso, sostituibile con un altro sistema di log. |
| Prova unitaria | `apps/web/test/integ001-meteo.test.tsx` | Servizio non raggiungibile: un solo avviso, senza URL né segreto, risposta ancora degradata; meteo disponibile: nessun avviso. |

## Verifica

| Prova | Comando | Esito |
|---|---|---|
| Prova unitaria della fix | `cd apps/web && npx vitest run test/integ001-meteo.test.tsx` | 14 test verdi (1 rosso prima della fix) |
| Tipi dei file toccati | `cd apps/web && npx tsc --noEmit` | nessun errore in `meteo-viaggio.ts` e `integ001-meteo.test.tsx` |

## Limiti

Verifica ridotta ai file toccati (nessuna suite completa). Il caso TB-REAL-004 va rieseguito nel collaudo di gruppo D (ST-QA-001D).
