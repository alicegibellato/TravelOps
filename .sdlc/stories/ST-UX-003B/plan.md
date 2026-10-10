# ST-UX-003B Plan

## Objective

UI bella, chiara e coinvolgente: interfaccia curata su pianifica, bozza, home, card viaggi, conferma, demo e Oggi (CB-1..CB-8).

## Scope

- In scope: apps/web (componenti, stili, token OKLCH, asset locali o illustrazioni CSS/SVG configurabili), packages/engine se serve, docs, evidence, test e2e/visivi.
- Out of scope: flussi e navigazione (ST-UX-003A); contenuti delle risposte chat, schede proposta in chat, strumenti degli agenti (CHAT-002).

## Assignment

- Claim: agente-ux-003b
- Branch: feature/ST-UX-003B
- Dependencies: nessuna (story indipendente da ST-UX-003A)

## Implementation Approach

Layout affiancato con chip modificabili in /pianifica; menu "..." per attivita' e giorno in /bozza con spostamenti brevi compatti; card e home con illustrazioni locali configurabili; un solo controllo di chiusura nella conferma; gerarchia visiva di Demo e Oggi con i token OKLCH di UX-002; stati vuoti/caricamento/errore; contrasto verificato con contrasto.ts e i test ux002; screenshot a 375 e 1280px come evidenza.

## Validation

Build e test verdi in locale; test e2e/visivi a 375 e 1280px; evidenza in evidence/ST-UX-003B.md.

## Open Questions

- None.
