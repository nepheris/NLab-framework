# Lot 9 preflight lock reference contract

Ce test protège les références entre le checklist machine Lot 9 et le registre de coordination, sans figer les statuts des agents.

## Pourquoi

`lot9-preflight.machine.json` contient des champs `coordination_task` / `coordination_tasks`. Le `LivePreflightRunner` utilise ensuite `task_id` pour injecter l'état vivant d'un lock dans `PreflightGateEvaluator`.

Une faute de frappe, un renommage de tâche non propagé ou un lock absent ferait sinon retomber le gate sur son snapshot avec un warning `TASK_STATE_MISSING`.

## Contrôles

`lot9-preflight-lock-references.test.mjs` :

1. charge le checklist canonique en lecture seule ;
2. charge les JSON du dossier `coordination/locks/` ;
3. vérifie l'unicité des `task_id` du registre ;
4. extrait toutes les références `coordination_task(s)` du Lot 9 ;
5. exige qu'elles résolvent chacune vers exactement un lock ;
6. contrôle pour ces locks : agent non vide, statut connu et `file_scope` non vide ;
7. injecte ces locks dans `PreflightGateEvaluator` ;
8. vérifie qu'aucun gate référencé ne produit `TASK_STATE_MISSING` ;
9. vérifie que l'état lu par PGE provient bien du lock correspondant.

## Ce que le test ne fige pas

Le contrat ne dit pas que telle tâche doit rester `done`, `review`, `blocked` ou `in_progress`.

Ces statuts sont volontairement mutables. Par exemple :

- TableWiz peut passer de `review` à `done` après validation ;
- V20 reste aujourd'hui HUMAN-blocked mais pourra évoluer ;
- les tâches techniques déjà intégrées restent simplement résolubles par leur `task_id`.

Le test vérifie la **continuité de référence**, pas un snapshot opérationnel particulier.

## Blockers explicites

Deux invariants Lot 9 restent contrôlés :

- `P9-007` conserve `blocked_human`, indépendamment de l'état technique de son lock ;
- `P9-008` conserve `blocked_external`, car il n'est pas résolu par un lock technique.

## Relation avec les autres contrôles

- `coordination-lock-health.test.mjs` contrôle la santé générale des locks ;
- `check-lock-overlaps.mjs` contrôle les collisions de `file_scope` ;
- `lot9-preflight-contract.test.mjs` contrôle la structure/sémantique du checklist ;
- ce contrat contrôle **les liens checklist → locks** ;
- `run-live-preflight.mjs` compose ensuite le tout au moment d'un préflight vivant.

## Exécution

```bash
node dev/framework/tests/lot9-preflight-lock-references.test.mjs
```

Résultat attendu :

```text
lot9 preflight lock reference tests: ok
```
