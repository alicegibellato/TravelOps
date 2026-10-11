# Prove di consegna: ST-UX-003A-FIX-DATA-CHAT (data reale nella chat di Pianifica)

## Cosa è stato chiesto

Segnalazione di Valerio (2026-10-11): in Pianifica, «voglio andare in Francia il prossimo mese» proponeva luglio, perché la chat usava l'orologio simulato della Demo (giugno 2026) invece della data reale.

## Perimetro ed esclusioni

- **Comprende:** `apps/web/src/chat/server/agenti.ts`: `orologioDellaConversazione` usa la data reale per una conversazione senza viaggio o con un viaggio in bozza (salvo `TRAVELOPS_OROLOGIO=simulato`); i viaggi confermati e la Demo seguono l'orologio di prima.
- **Esclude:** la pagina Demo e l'orologio dei viaggi confermati.
- **Deviazioni:** solo test minimi, per richiesta di Valerio.

## Prove

- Test minimi della chat e dell'orologio superati.
