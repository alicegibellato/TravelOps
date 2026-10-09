# Istantanee delle destinazioni precaricate

Qui stanno le istantanee del catalogo salvate nel repository (`modello-dominio-estensioni.md` §7.8): un file `<id>.json` per istantanea, nel formato descritto in `../README.md`.

- Le 3 destinazioni precaricate della §8.1 (Lago di Garda, Roma, Dolomiti – Val di Fassa), costruite con la sorgente reale da `npm run istantanee --workspace @travelops/sources` (ST-CAT-002). Le risposte delle fonti usate per costruirle sono in `../registrazioni/precaricate.json`: con quelle la stessa costruzione, senza rete, dà esattamente questi file (test `test/ca1-precaricate.test.ts`).
- Al primo avvio la web app carica nel suo database tutte le istantanee di questa cartella (ST-CAT-002A). Se la cartella non ha file `.json`, non succede niente.
- Ogni file deve essere valido e rispettare i minimi della §8.1: lo verifica il test `test/cartella.test.ts`.
- Un'istantanea non cambia mai: per aggiornare una destinazione si aggiunge un file nuovo con un identificativo nuovo.
- Qui non vanno dati di test: l'istantanea di prova dei test è in `../test/dati/`.
