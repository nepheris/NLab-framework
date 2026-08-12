# Live preflight runner

`run-live-preflight.mjs` compose les briques de consolidation sans modifier leurs responsabilités :

- `check-lock-overlaps.mjs` fournit le chargement des locks **et** le contrôle des chevauchements actifs ;
- `audit-lock-health.mjs` valide la santé structurelle du registre ;
- `PreflightGateEvaluator` calcule les états effectifs des gates.

## Usage

```bash
node dev/framework/tools/coordination/run-live-preflight.mjs \
  dev/framework/doc/roadmap/lot9-preflight.machine.json \
  dev/framework/doc/roadmap/coordination/locks
```

Avec overrides explicites :

```bash
node dev/framework/tools/coordination/run-live-preflight.mjs \
  dev/framework/doc/roadmap/lot9-preflight.machine.json \
  dev/framework/doc/roadmap/coordination/locks \
  /path/to/preflight-overrides.json
```

## Codes de sortie

- `0` : tous les gates requis sont `pass` ;
- `2` : rapport valide mais intégration réelle encore bloquée **ou chevauchement actif de locks** ;
- `1` : usage, JSON, registre de locks ou exécution invalide.

## Ordre de contrôle

1. Lecture et parsing du checklist.
2. Chargement de tous les locks JSON.
3. Refus des erreurs de parsing.
4. Audit de santé des locks.
5. Refus si le registre contient une erreur structurelle.
6. Recherche des chevauchements de `file_scope` entre locks occupés.
7. Refus d'un verdict de readiness si une collision active existe (`ACTIVE_LOCK_OVERLAP`).
8. Construction du mapping `task_id → lock`.
9. Chargement éventuel des overrides.
10. Évaluation des gates.
11. Production du rapport `nlab.live-preflight-report` V1.

Les warnings de santé des locks sont conservés dans le rapport mais ne libèrent jamais un scope et ne transforment jamais un blocker HUMAN en succès.

## Collision de locks

La santé structurelle et l'absence de collision sont deux contrôles différents. Deux locks peuvent être valides individuellement tout en revendiquant le même fichier.

Le runner réutilise `findLockConflicts()` du checker historique. Si au moins un chevauchement actif est détecté :

- la bibliothèque lève `LivePreflightRunnerError` avec le code `ACTIVE_LOCK_OVERLAP` ;
- `details.conflicts` contient les tâches, agents, branches et paires de scopes ;
- le CLI renvoie `2` ;
- aucun rapport `ready_for_real_integration:true` n'est produit.

Cette règle matérialise le gate Lot 9 `P9-011` : un registre sans erreur structurelle ne suffit pas, il faut aussi zéro collision active.

## Overrides

Le fichier facultatif peut contenir directement les gates :

```json
{
  "P9-007": {
    "status": "pass",
    "reason": "Validation humaine enregistrée"
  }
}
```

ou les encapsuler dans une clé `overrides`.

Les overrides sont délégués au `PreflightGateEvaluator`. Ils constituent le seul mécanisme permettant de lever explicitement un `blocked_human` ou `blocked_external` documentaire. Ils ne permettent pas de contourner une collision de locks : le contrôle d'overlap est exécuté avant l'évaluation des overrides.

## Rapport

Lorsqu'aucune collision n'est détectée, le rapport contient :

- schéma/version/date de génération ;
- fichiers sources utilisés ;
- `coordination.active_lock_overlaps: 0` ;
- synthèse de santé des locks ;
- rapport complet `PreflightGateEvaluator` ;
- booléen racine `ready_for_real_integration`.

## Frontières

Le runner est strictement read-only :

- aucune modification de checklist ;
- aucune modification/libération de lock ;
- aucun changement de roadmap canonique ;
- aucune validation visuelle automatique ;
- aucun accès GitHub implicite ;
- aucune exécution de tests métier à la place des gates ;
- aucune résolution automatique d'une collision.

Il transforme simplement l'état documentaire et l'état de coordination local en décision machine reproductible.
