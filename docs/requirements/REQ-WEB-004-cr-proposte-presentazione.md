# REQ-WEB-004 — CR su REQ-WEB-002: proposte, versioni e modalità presentazione con il nuovo design

| Campo | Valore |
|---|---|
| Stato | Proposto con `requirement propose` |
| Versione | 1.0 |
| Data | 2026-10-09 |
| Ondata | 2 — Prodotto (CR-001) |
| Tipo | **CR su REQ-WEB-002**: requisito nuovo che ne modifica il comportamento; REQ-WEB-002 e la sua storia restano invariati |
| Dipende da | REQ-UX-001 (ST-UX-001), REQ-WEB-003 (ST-WEB-003), REQ-DATA-001 (ST-DATA-001), REQ-WEB-002 (ST-WEB-002, ondata 1) |
| Fonti (`--source`) | questo file, `modello-dominio.md`, `dati-di-riferimento.md`, `modello-dominio-estensioni.md`, `dati-di-riferimento-estensioni.md` |
| Tetto di autonomia proposto | `checkpointed` |
| Storia e PR | `ST-WEB-004`, una pull request |
| Origine | `docs/CR-001-travelops-prodotto-demo.md` §9.3 |

> I rimandi §7.x sono a `modello-dominio-estensioni.md`, i rimandi §8.x a `dati-di-riferimento-estensioni.md`, gli altri alla CR-001.

## Cambia rispetto a REQ-WEB-002

- La **vista proposta** diventa una scheda chiara: titolo in parole semplici ("Pioggia sabato mattina: ti propongo il MAG al posto del trekking"), livello di ripianificazione (§7.6), modifiche "prima → dopo" evidenziate nella linea del tempo (rimossi barrati in rosso, aggiunti in verde, spostati in giallo), elementi a rischio con un avviso chiaro, alternative come pulsanti, **Accetta** e **Rifiuta** ben visibili.
- **Versioni** come cronologia con data, causa in parole semplici e "Confronta".
- La **pagina Demo** diventa **Modalità presentazione**, raggiungibile da un'icona discreta nell'intestazione: orologio simulato, "Ripristina i viaggi demo", elenco degli scenari con descrizione in parole semplici. Il nome del viaggiatore predefinito resta modificabile.
- Lo stato si salva nel database (REQ-DATA-001) invece che nel file JSON.

## Criteri di accettazione

- **CA-1** I criteri di accettazione di REQ-WEB-002 restano soddisfatti; CA-8 vale con lo stato salvato nel database di REQ-DATA-001.
- **CA-2** La proposta mostra un titolo in parole semplici, il livello di ripianificazione, le modifiche evidenziate nella linea del tempo (rimossi, aggiunti e spostati con colori diversi), gli elementi a rischio, le alternative come pulsanti, Accetta e Rifiuta.
- **CA-3** Su telefono Accetta e Rifiuta stanno in una barra fissa in basso, raggiungibili senza scorrere.
- **CA-4** Le versioni sono una cronologia con data, causa in parole semplici e il pulsante Confronta.
- **CA-5** La pagina Demo diventa Modalità presentazione, raggiungibile da un'icona nell'intestazione, con orologio simulato, Ripristina i viaggi demo e scenari descritti in parole semplici.
- **CA-6** Nessun codice tecnico a vista, come in REQ-UX-001 CA-6.

## Campi per il plugin

- **Sintesi** (`--summary`): Modifica di REQ-WEB-002: vista proposta chiara con livello di ripianificazione e modifiche evidenziate, cronologia delle versioni, la pagina Demo diventa Modalità presentazione, stato salvato nel database.
- **Criteri** (`--acceptance`): CA-1…CA-6.
- **Fuori perimetro** (`--non-goal`): Prenotazioni, pagamenti, modifiche o cancellazioni presso fornitori. Apertura automatica dei link delle alternative.
- **Vincoli** (`--constraint`): Nessuna logica del motore duplicata nella web app: proposte, controlli e versioni vengono dal motore. Testi in italiano e in linguaggio semplice; nessun codice tecnico a vista per il viaggiatore. I link delle alternative si aprono solo su clic del viaggiatore, in una nuova scheda.
- **Percorsi** (`--write-path`): `apps/web`, `docs`, `evidence`.
