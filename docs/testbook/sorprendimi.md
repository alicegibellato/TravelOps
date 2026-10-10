# Sorprendimi (`TB-SURP`) · gruppo B

Componente «Non sai dove andare? Sorprendimi», presente al passo 1 di `/preferenze` (link «Scelgo più tardi: sorprendimi») e in `/destinazione`.

### TB-SURP-001 · Tre idee e scelta

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca1-preferenze`)
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. In `/preferenze`, passo 1, premi «Scelgo più tardi: sorprendimi».
  2. In «Cosa ti piace» scegli «natura», in «In che mese parti?» un mese futuro.
  3. Premi «Sorprendimi».
  4. Scegli la prima idea della lista «Le idee per te».
- **Atteso**: durante l'attesa il pulsante mostra «Cerco idee…»; compaiono esattamente tre idee, ciascuna con nome e motivo; dopo la scelta la destinazione compare nel riepilogo e si può premere «Avanti».

### TB-SURP-002 · Nessuna preferenza indicata

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri Sorprendimi senza scegliere nulla in «Cosa ti piace» e premi «Sorprendimi».
- **Atteso**: si vede la nota «Cosa ti piace? Se non scegli nulla, uso cultura e natura.» e le tre idee sono coerenti con cultura e natura.

### TB-SURP-003 · Troppi vincoli, nessuna idea

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. In «Cosa preferisci evitare» seleziona tutte le voci.
  2. Premi «Sorprendimi».
- **Atteso**: compare «Con queste scelte non ho idee da proporti: prova a evitare meno cose.»; nessun errore; togliendo un vincolo e riprovando arrivano le idee.

### TB-SURP-004 · Cambiare idea

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: TB-SURP-001 eseguito fino alla scelta.
- **Azioni**:
  1. Premi «Scegli un'altra idea».
  2. Scegli la seconda idea.
- **Atteso**: torna la lista delle idee (le stesse tre, senza nuova ricerca); la destinazione nel riepilogo diventa la seconda idea; la prima non resta salvata da nessuna parte.
