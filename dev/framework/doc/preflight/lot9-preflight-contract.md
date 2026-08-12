# Lot 9 machine preflight contract

Ce contrat protège le fichier canonique `dev/framework/doc/roadmap/lot9-preflight.machine.json` sans le modifier.

## But

Le checklist de l'Agent C est désormais consommé par `PreflightGateEvaluator` et `run-live-preflight.mjs`. Le test `lot9-preflight-contract.test.mjs` fige les hypothèses nécessaires à ces outils afin qu'une évolution documentaire ne change pas silencieusement la décision machine.

## Invariants contrôlés

### Identité et politique

Le test vérifie notamment :

- `document_id = NLAB-WEB-FRAMEWORK-LOT9-PREFLIGHT` ;
- tâche source `9-PREFLIGHT-MACHINE-CHECKLIST`, Agent C ;
- branche canonique `New` ;
- `status_is_snapshot: true` ;
- `live_status_source` vers `coordination/locks/` ;
- aucune modification runtime, démo ou `roadmap.md` autorisée par le checklist lui-même.

### Statuts et gates

- `status_enum` doit rester identique à `PreflightGateEvaluator.gateStatuses()` ;
- les `gate_id` doivent être uniques et respecter `P9-NNN` ;
- chaque gate utilise un statut connu ;
- chaque gate possède au moins un critère d'acceptation non vide.

### Sémantique `ready`

Le fichier réel définit `P9-009` et `P9-010` comme :

- requis pour l'intégration réelle ;
- `status: ready` ;
- absents de `blocking_gates_snapshot`.

Le contrat garantit donc qu'un gate documentaire `ready` reste non bloquant, tout en demeurant distinct de `pass`.

Cette règle ne s'applique pas aux locks techniques : `PreflightGateEvaluator` projette un lock `review` en `in_progress`, car une branche en revue n'est pas encore intégrée dans `New`.

### Snapshot des blockers

Le test recalcule les blockers documentaires à partir des gates requis dont le statut est :

- `in_progress` ;
- `pending` ;
- `blocked_human` ;
- `blocked_external`.

La liste calculée doit être strictement identique à `decision.blocking_gates_snapshot`.

Il vérifie aussi explicitement :

- `P9-007 = blocked_human` ;
- `P9-008 = blocked_external` ;
- `P9-009/P9-010 = ready` et non bloquants.

### Discipline multi-agent

`P9-011` doit rester non requis, `pass`, et contenir un critère d'acceptation exprimant l'absence de chevauchement actif de `file_scope`. Le contrôle vivant de ce critère est effectué par `run-live-preflight.mjs`, qui réutilise `findLockConflicts()`.

### Compatibilité avec PreflightGateEvaluator

Le test exécute le vrai checklist dans `PreflightGateEvaluator` sans état de tâche vivant injecté. Dans ce mode snapshot :

- la liste des blockers calculée par l'évaluateur doit rester égale au snapshot du document ;
- `ready_for_real_integration` reste `false` ;
- les gates associés à des tâches produisent des warnings `TASK_STATE_MISSING`, ce qui confirme que le document n'est pas confondu avec l'état de coordination courant.

Le runner vivant est ensuite responsable d'injecter les vrais locks.

## Pourquoi un test séparé

Le JSON de C reste une source documentaire versionnée. Les outils de préflight sont des moteurs génériques. Le test de contrat se place entre les deux :

- aucune logique métier Recettes du Coeur n'entre dans le moteur générique ;
- aucune réécriture automatique du checklist n'est effectuée ;
- une divergence sémantique devient un échec de test explicite plutôt qu'un changement silencieux de go/no-go.

## Exécution

```bash
node dev/framework/tests/lot9-preflight-contract.test.mjs
```

Résultat attendu :

```text
lot9 preflight contract tests: ok
```
