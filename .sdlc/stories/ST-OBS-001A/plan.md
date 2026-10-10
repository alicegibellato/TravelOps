# ST-OBS-001A Plan

## Objective

Pagina /qualita con l'ultimo report dei test (CA-1 e CA-2 di REQ-OBS-001, parte test).

## Scope

- In scope: apps/web (pagina, lettura del report, stile), scripts (reporter), package.json, docs, evidence.
- Out of scope: tracce degli agenti (ST-OBS-001B).

## Assignment

- Claim: claude-pc3
- Branch: feature/ST-OBS-001A
- Dependencies: nessuna

## Implementation Approach

Un reporter negli script di test scrive reports/test-report.json (percorso configurabile); l'app lo legge lato server, lo valida e lo mostra per suite; stato vuoto se manca o non e' valido.

## Validation

Build e test verdi in locale; e2e a 375 e 1280px; evidenza in evidence/ST-OBS-001A.md.

## Open Questions

- None.
