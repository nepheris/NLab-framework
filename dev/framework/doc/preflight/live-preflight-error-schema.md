# LivePreflight CLI error schema V1

Le CLI `run-live-preflight.mjs` possède désormais une enveloppe d'erreur machine versionnée :

- `schema = nlab.live-preflight-error` ;
- `version = 1` ;
- JSON Schema Draft 2020-12 : `dev/framework/data/live-preflight-error.schema.json`.

## Pourquoi

Le rapport de succès est déjà versionné sous `nlab.live-preflight-report` V1. Avant ce contrat, les erreurs runtime utilisaient `{ok:false,error:{...}}` sans identifiant/version et l'erreur d'usage était une simple chaîne sur `stderr`.

Un consommateur machine ne pouvait donc pas distinguer de manière stable :

- un rapport de préflight ;
- une collision active de locks ;
- une erreur de registre/JSON ;
- une erreur d'override ;
- un appel CLI invalide.

## Enveloppe V1

```json
{
  "schema": "nlab.live-preflight-error",
  "version": 1,
  "ok": false,
  "exit_code": 1,
  "error": {
    "name": "LivePreflightRunnerError",
    "code": "USAGE",
    "message": "preflightFile and locksDirectory are required",
    "details": {
      "usage": "node run-live-preflight.mjs <preflight.json> <locks-directory> [overrides.json]"
    }
  }
}
```

## Codes de sortie

Le contrat ne change pas la sémantique existante :

- `1` : usage, parsing, santé des locks, override ou erreur d'exécution ;
- `2` : collision active de `file_scope` (`ACTIVE_LOCK_OVERLAP`).

Le champ `exit_code` reflète le code réellement retourné par `runCli()`.

## API

Le runner exporte :

- `LIVE_PREFLIGHT_ERROR_SCHEMA` ;
- `LIVE_PREFLIGHT_ERROR_VERSION` ;
- `livePreflightErrorPayload(error, options)`.

Cette fonction centralise l'enveloppe et évite que plusieurs chemins CLI produisent des formats divergents.

## Test

`live-preflight-runner.test.mjs` vérifie :

- la construction directe d'une enveloppe ;
- l'erreur réellement écrite sur `stderr` en cas de collision active ;
- `exit_code: 2` + `ACTIVE_LOCK_OVERLAP` ;
- l'erreur d'usage réellement écrite sur `stderr` ;
- `exit_code: 1` + `USAGE` + texte d'usage.

## Frontières

Ce contrat :

- ne change aucun gate ;
- ne change aucun code de sortie ;
- ne modifie pas le schéma de succès ;
- ne transforme pas les erreurs de la bibliothèque `runLivePreflight()` en objets retournés : la bibliothèque continue à lever des erreurs structurées ;
- versionne uniquement la sortie machine du CLI.
