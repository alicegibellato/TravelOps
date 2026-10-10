# Preferenze (`TB-PREF`) · gruppo B

Pagina `/preferenze`: percorso guidato in 5 passi («Dove», «Quando e quanto», «Chi», «Che viaggio», «Dettagli facoltativi»), riepilogo «Il tuo viaggio finora», pulsante finale «Crea la mia bozza». Lo stesso percorso compare anche in `/pianifica` («Le tue preferenze»).

### TB-PREF-001 · Percorso completo fino alla bozza

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì (e2e `ca1-preferenze`)
- **Precondizioni**: stato pulito, `TRAVELOPS_ASSISTENTE=finto`.
- **Azioni**:
  1. Apri `/preferenze`.
  2. Passo 1 «Dove»: scegli una voce di «Destinazioni pronte» (es. Lago di Garda) e premi «Avanti».
  3. Passo 2: indica «Dal»/«Al» con 4 giorni nel futuro e premi «Avanti».
  4. Passo 3: «Adulti» 2, «Bambini» 0, «Avanti».
  5. Passo 4: ritmo «Bilanciato», premi «Avanti»; passo 5 lascialo vuoto.
  6. Premi «Crea la mia bozza».
- **Atteso**: l'indicatore mostra «Passo N di 5» corretto a ogni passo; dopo il clic compare «Preparo la bozza…» e in meno di 10 s si apre `/bozza/<viaggio>` con 4 giorni, titolo coerente con la destinazione e 3 attività al giorno.

### TB-PREF-002 · Passo e dati conservati al ricaricamento

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: Valerio (PC2), caso 16.
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. In `/preferenze` completa i passi 1 e 2 e arriva al passo 3.
  2. Ricarica la pagina (F5).
- **Atteso**: riparti da «Passo 3 di 5»; destinazione e date restano nel riepilogo «Il tuo viaggio finora»; compare «Preferenze salvate».

### TB-PREF-003 · Avanti senza i dati obbligatori

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. In `/preferenze`, al passo 1, premi «Avanti» senza scegliere la destinazione.
  2. Scegli la destinazione, vai al passo 2 e premi «Avanti» senza date né mese.
- **Atteso**: compare l'avviso «Prima di andare avanti» con l'indicazione del dato mancante; il passo non cambia; nessun errore tecnico. Se arrivi al passo finale con dati mancanti, «Mancano ancora delle informazioni» offre il link «Vai a «<passo>»» che porta al passo giusto.

### TB-PREF-004 · Passi saltabili e valori predefiniti

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Completa i passi 1 e 2.
  2. Premi «Salta» ai passi «Chi», «Che viaggio» e «Dettagli facoltativi».
  3. Apri «Altre N preferenze (predefinite)» nel riepilogo, poi «Nascondi le altre».
- **Atteso**: «Salta» è presente solo sui passi 3-5; il riepilogo elenca i valori predefiniti usati; «Crea la mia bozza» funziona.

### TB-PREF-005 · Senza chiave «Crea la mia bozza» non resta bloccato

- **Priorità** P1 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: nessuna `OPENAI_API_KEY` nell'ambiente, `TRAVELOPS_ASSISTENTE` non impostata.
- **Azioni**:
  1. Completa il percorso di TB-PREF-001.
  2. Premi «Crea la mia bozza» e attendi 15 s.
- **Atteso**: la bozza si apre (il percorso a pulsanti non dipende dal modello) oppure compare un messaggio chiaro con un'azione per proseguire. Il pulsante non resta su «Preparo la bozza…» all'infinito.

### TB-PREF-006 · Mese e durata: giorno di partenza

- **Priorità** P3 · **Modalità** finto · **Automatizzabile** sì
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7`.
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Al passo 2 scegli in «Come vuoi indicare le date» il mese, poi «In che mese parti?» = un mese futuro e «Quanti giorni» = 4.
  2. Crea la bozza.
- **Atteso**: il riepilogo e la bozza mostrano date di partenza e ritorno esplicite; la partenza non è fissata sempre al 1° del mese senza dirlo (o è scelta con un criterio dichiarato, o è modificabile prima di creare la bozza).

### TB-PREF-007 · Date non valide

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Al passo 2 imposta «Al» precedente a «Dal» e premi «Avanti».
  2. Imposta «Dal» nel passato e premi «Avanti».
- **Atteso**: per entrambi un avviso comprensibile vicino al campo; il passo non avanza; le date valide già scritte non vengono cancellate.

### TB-PREF-008 · Il percorso segna i passi compilati

- **Priorità** P2 · **Modalità** finto · **Automatizzabile** sì (e2e `ux003b-pianifica`)
- **Fonte**: collaudo di Alice (PC1), commit `acb8da7` (ST-UX-003B).
- **Precondizioni**: stato pulito.
- **Azioni**:
  1. Apri `/pianifica`, compila «Dove» e «Quando e quanto» in «Le tue preferenze».
  2. Torna al passo 1 con «Indietro».
- **Atteso**: i passi compilati risultano segnati come completati (anche per i lettori di schermo) e quelli mancanti no; tornare indietro non perde i dati.
