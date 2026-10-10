# Accessibilità (`TB-A11Y`) · gruppo D

Casi trasversali: tastiera, focus, etichette, contrasti, lettori di schermo. Desktop 1280 px.

### TB-A11Y-001 · Contenuto principale per i lettori di schermo

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (albero di accessibilità)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (`<main>` con solo «Caricamento…»).
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri home, `/bozza/<viaggio>`, «Oggi» e «Versioni» e leggi l'albero di accessibilità di `<main>` a caricamento finito.
- **Atteso**: `<main>` contiene titolo h1 e contenuti della pagina; «Caricamento» compare solo durante il caricamento e poi sparisce.

### TB-A11Y-002 · Percorso preferenze solo da tastiera

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Completa TB-PREF-001 usando solo Tab, Maiusc+Tab, Invio, Spazio e frecce.
- **Atteso**: ogni controllo è raggiungibile in ordine logico con focus visibile; a ogni cambio di passo il focus va al titolo del passo.

### TB-A11Y-003 · Menu della bozza da tastiera

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: bozza aperta.
- **Azioni**:
  1. Apri «Modifica giorno» con Invio, scorri le voci con le frecce, apri «Scambia con…» con freccia destra.
  2. Premi Esc due volte.
- **Atteso**: le voci si scorrono con le frecce; Esc chiude prima il sottomenu, poi il menu; il focus torna al pulsante che li ha aperti.

### TB-A11Y-004 · Etichette dei campi

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì (controllo automatico delle etichette)
- **Precondizioni**: nessuna.
- **Azioni**:
  1. Controlla i campi di `/preferenze`, `/destinazione`, `/imprevisti` (una scheda aperta), `/demo` e della chat.
- **Atteso**: ogni campo ha un'etichetta associata leggibile (es. «Scrivi un messaggio», «Data», «Ora», «Quando»); i pulsanti con sola icona hanno un nome («Invia», «Chiudi», «Menu»).

### TB-A11Y-005 · Contrasti e testi

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì (verifica automatica dei contrasti)
- **Precondizioni**: nessuna.
- **Azioni**:
  1. Esegui la verifica dei contrasti su home, bozza, «Oggi», proposta, «Qualità», «Demo».
- **Atteso**: testi e controlli rispettano almeno il rapporto 4.5:1 (3:1 per testo grande); badge di stato e avvisi non si distinguono solo per colore.
