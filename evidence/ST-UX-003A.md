# Prove di consegna: ST-UX-003A (criteri CA-1, CA-2, CA-3, CA-4, CA-6 e CA-7)

## Cosa è stato chiesto

REQ-UX-003, story `ST-UX-003A`: flussi collegati della web app. Questa parte copre:

1. CA-1 da /pianifica, con una bozza, un'azione evidente «Apri la bozza» (o «Apri il viaggio» se confermato) che porta dove la bozza si modifica e si conferma;
2. CA-2 i viaggi della base dati (demo e creati dal viaggiatore, dalla chat o dai filtri) compaiono in «I miei viaggi» e si aprono nelle pagine del viaggio, nei giorni, negli elementi e in Oggi;
3. CA-3 l'orologio di ogni viaggio è configurabile (`TRAVELOPS_OROLOGIO`: automatico, reale, simulato); i viaggi demo restano simulati;
4. CA-4 il passo del percorso guidato delle preferenze sopravvive al ricaricamento della pagina;
5. CA-6 «Ripristina i viaggi demo» azzera anche lo scenario in corso;
6. CA-7 i flussi e2e di questi criteri.

## Perimetro ed esclusioni

- **Comprende:** home, /pianifica, preferenze, pagine del viaggio (giorni, elementi, Oggi), Demo, lettura dei viaggi salvati e orologio dei viaggi.
- **Esclude:** tutto ciò che riguarda il telefono, anche la web app aperta da telefono (decisione di progetto del 2026-10-10): CA-5 (chat a tutto schermo sul telefono) non è implementato; le verifiche sono su computer.
- **Deviazioni:** il test di REQ-DATA-001 che dopo il ripristino si aspettava lo scenario S1 ora si aspetta nessuno scenario (CA-6), annunciato sul canale.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| CA-1: «Apri la bozza» in /pianifica | `apps/web/src/chat/PaginaPianifica.tsx`, `apps/web/src/ui/ui.css` |
| CA-2: viaggi della base dati nell'app | `apps/web/src/dati/viaggi-salvati.ts`, `apps/web/src/viste/home.ts`, `apps/web/app/page.tsx`, `apps/web/app/viaggi/[viaggio]/**`, `apps/web/app/oggi/page.tsx`, `apps/web/src/bozza/servizio.ts`, `apps/web/src/chat/server/*.ts` |
| CA-3: orologio dei viaggi | `apps/web/src/oggi/orologio.ts`, `apps/web/src/oggi/operazioni.ts`, `apps/web/.env.example` |
| CA-4: passo delle preferenze in `sessionStorage` | `apps/web/src/componenti/PercorsoPreferenze.tsx` |
| CA-6: ripristino che azzera lo scenario | `apps/web/src/stato/operazioni.ts`, `apps/web/test/data001-accesso.test.ts` |
| Test | `apps/web/test/ux003a-ca2-viaggi-utente.test.tsx`, `ux003a-ca3-orologio.test.ts`, `supporto-ux003a.ts`; `apps/web/e2e/ux003a-flussi.e2e.ts` |

## Prove

- `npm ci && npm run build`: riuscito (la CI del progetto è disattivata, prova locale).
- Test unitari nel perimetro (`ux003a-ca2`, `ux003a-ca3`, `data001-accesso`, `ux001-guscio-home`): 38 superati, 0 falliti.
- Flussi e2e `e2e/ux003a-flussi.e2e.ts` (CA-1, CA-2, CA-4, CA-6): 12 superati, 0 falliti.
- Screenshot su computer (1280 px): `evidence/ST-UX-003A/screenshots/ca1-pianifica-apri-bozza.png`, `ca2-home-i-miei-viaggi.png`.
- Conflitti con main (`agenti.ts`, `home.ts`, illustrazioni dei luoghi di ST-UX-004B) risolti tenendo entrambe le modifiche; test ripetuti dopo il riallineamento.
