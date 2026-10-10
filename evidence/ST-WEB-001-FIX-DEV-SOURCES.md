# ST-WEB-001-FIX-DEV-SOURCES

Difetto: su una copia appena clonata `npm run dev` dalla radice compilava solo `@travelops/engine`, ma `apps/web` importa anche `@travelops/sources` e `@travelops/agents` (che puntano a `dist/`), quindi l'avvio falliva con "Module not found: Can't resolve '@travelops/sources'".

Fix: lo script `dev` della radice compila in ordine di dipendenza engine, sources, agents e poi avvia l'app web.

Verifica su copia pulita (clone, `npm ci`, `PORT=3917 npm run dev`): `GET /` risponde 200 (log di Next: `GET / 200`). Server poi fermato; la porta non risponde piu.
