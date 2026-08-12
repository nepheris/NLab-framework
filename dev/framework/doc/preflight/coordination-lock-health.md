# Coordination lock health audit

`audit-lock-health.mjs` complète `check-lock-overlaps.mjs` sans le modifier.

Le checker historique répond à une question : **deux locks occupés peuvent-ils toucher le même fichier ?**

L'auditeur de santé répond à une autre question : **les enregistrements de locks sont-ils structurellement cohérents et suffisamment frais pour être utilisés comme source de vérité ?**

## Usage

```bash
node dev/framework/tools/coordination/audit-lock-health.mjs \
  dev/framework/doc/roadmap/coordination/locks
```

Code de sortie :

- `0` : aucune erreur structurelle ;
- `2` : au moins une erreur de santé/parsing ;
- `1` : erreur d'usage ou d'exécution.

Les warnings n'échouent pas le contrôle : ils servent à signaler une dette de coordination sans transformer automatiquement une ancienne convention en erreur bloquante.

## Erreurs contrôlées

- `TASK_ID_REQUIRED` ;
- `AGENT_REQUIRED` ;
- `UNKNOWN_STATUS` ;
- `FILE_SCOPE_REQUIRED` / `FILE_SCOPE_EMPTY` ;
- `OCCUPIED_BRANCH_REQUIRED` ;
- `INVALID_TIMESTAMP` ;
- `TIMESTAMP_ORDER` ;
- `DUPLICATE_TASK_ID` ;
- `LOCK_PARSE_ERROR`.

## Warnings contrôlés

- scope dupliqué dans un même lock ;
- `review` sans numéro de PR ;
- `done` sans `completed_at` ;
- `released` sans `released_at` ;
- deux tâches occupées partageant la même branche ;
- lock occupé potentiellement stale.

## Staleness

L'API `auditLock()` / `auditLocks()` accepte :

- `clock` injectable ;
- `staleAfterMs`, 6 heures par défaut.

Le calcul utilise le timestamp de cycle de vie le plus récent disponible : `completed_at`, `released_at`, `review_at`, `started_at`, puis `reserved_at`.

Un lock stale produit uniquement un warning. L'auditeur ne libère jamais un lock automatiquement.

## États reconnus

- occupés : `reserved`, `in_progress`, `blocked`, `review` ;
- libérés : `done`, `released`.

Ce vocabulaire est aligné sur le checker d'overlap existant.

## Frontières

L'outil :

- importe `loadLocks()` depuis `check-lock-overlaps.mjs` ;
- ne modifie aucun lock ;
- ne modifie pas le checker d'overlap ;
- ne prend aucune décision de merge ;
- ne touche ni roadmap canonique, ni agent-board, ni démo ;
- ne considère jamais un warning stale comme une autorisation de reprendre le scope.

Il est destiné au préflight multi-agent et aux audits de consolidation.
