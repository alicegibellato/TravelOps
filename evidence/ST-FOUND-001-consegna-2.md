# Prove di consegna: ST-FOUND-001, seconda consegna

## Cosa è stato chiesto

Chiudere la story `ST-FOUND-001` (requisito REQ-FOUND-001, "Fondamenta del progetto") dopo che il codice è arrivato su `main` con un merge manuale, e registrare la verifica di CA-8 che la prima consegna aveva lasciato da fare sulla pull request.

## Perimetro ed esclusioni

- **Comprende:** questo documento di prove.
- **Esclude:** qualsiasi modifica al codice: le fondamenta sono già su `main` con la PR #1.
- **Deviazione registrata:** la prima consegna (`AUT-PR-FOUND-001`) è chiusa come annullata. Il codice consegnato è però quello della PR #1, mergiata a mano.

## Cosa è cambiato

| Scopo | File |
| --- | --- |
| Prove della seconda consegna | `evidence/ST-FOUND-001-consegna-2.md` |

## Perché

- La prima consegna includeva il merge eseguito dal plugin. Il merge governato si è bloccato per un difetto del plugin (versione 0.22.0): il confronto dell'URL della pull request distingue maiuscole e minuscole, e confronta `alicegibellato/TravelOps`, come lo restituisce GitHub, con `alicegibellato/travelops`, come lo normalizza il plugin.
- Alice ha quindi fatto il merge della PR #1 a mano su GitHub (merge commit `63ac6b8`, 2026-10-09 10:39 UTC).
- Il plugin non può registrare a posteriori un merge fatto fuori dal suo controllo, e non permette di chiudere una story da cui dipendono altre story. Per questo la story continua con questa seconda consegna, che esclude il merge: la PR si chiude come pronta per la review e il merge lo fa una persona.
- Il difetto è stato segnalato all'autore del plugin, che lo sta correggendo.

## Verifica

| Criterio | Verifica | Esito |
| --- | --- | --- |
| CA-8 GitHub Action su push e pull request verso `main`, che fallisce se un test fallisce | Workflow "CI", job "Build e test", verde sulla PR #1 sia per l'evento push sia per l'evento pull_request: esecuzioni 37918300033 e 37918394145 su `a552285` | superato |
| CA-1…CA-7, CA-9…CA-11 | Verificati nella prima consegna, vedi `evidence/ST-FOUND-001.md`; il codice su `main` è lo stesso commit `a552285` | superato |
| Codice su `main` | `main` contiene `a552285` tramite il merge commit `63ac6b8` della PR #1 | superato |

## Collegamenti

- Requisito `REQ-FOUND-001`, story `ST-FOUND-001`
- Prima consegna: contratto `contract-ST-FOUND-001-implementation`, profilo `AUT-PR-FOUND-001` (chiuso come annullato), PR https://github.com/alicegibellato/TravelOps/pull/1, commit `a552285`, merge `63ac6b8`
- Seconda consegna: contratto `contract-ST-FOUND-001-release-r2`, profilo `AUT-PR-FOUND-001-R2`, branch `feature/ST-FOUND-001-r2`
- Prove della prima consegna: `evidence/ST-FOUND-001.md`
