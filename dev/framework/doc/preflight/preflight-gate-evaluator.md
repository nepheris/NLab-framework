# PreflightGateEvaluator

`PreflightGateEvaluator` recalcule l'état effectif d'un préflight machine à partir de deux sources séparées :

1. le document de préflight, qui reste un **snapshot** documentaire ;
2. les états de coordination injectés au moment du contrôle.

Il ne lit pas GitHub, ne parcourt pas le filesystem et ne modifie aucun lock. L'appelant reste responsable de fournir les états vivants.

## Objectif

Le préflight Lot 9 déclare explicitement `status_is_snapshot: true` et `live_status_source: dev/framework/doc/roadmap/coordination/locks/`. L'évaluateur fournit la brique générique entre ces deux niveaux afin d'éviter de prendre un ancien statut documentaire pour un état courant.

La sémantique `ready` est alignée sur le fichier machine Lot 9 : `P9-009` et `P9-010` sont des gates requis marqués `ready` mais absents de `blocking_gates_snapshot`. Un gate `ready` signifie donc **préparé et non bloquant pour l'entrée dans l'intégration**, sans être équivalent à `pass`.

## Mapping des états de coordination

| état de tâche | état de gate |
|---|---|
| `done`, `complete`, `completed` | `pass` |
| `review` | `in_progress` |
| `reserved`, `in_progress` | `in_progress` |
| `blocked`, `free` | `pending` |

`review` reste volontairement inachevé : un travail présent uniquement sur une branche de revue ne doit pas débloquer un gate comme s'il était intégré dans `New`.

Un statut inconnu n'est jamais interprété silencieusement : il produit un warning et le snapshot conserve son rôle de repli.

## Règles conservatrices

- Un gate multi-tâches utilise l'état le plus contraignant des tâches connues.
- Si une des tâches attendues n'a pas d'état exploitable, le gate ne peut pas être promu au-delà de son snapshot.
- Un snapshot `blocked_human` ou `blocked_external` reste bloquant même si une tâche technique passe à `done`.
- La levée d'un blocage humain/externe exige un `override` explicite ; le LivePreflightRunner impose en plus un motif d'audit.
- `review` n'est jamais assimilé à `ready` ni à `pass`.
- Les gates requis `in_progress`, `pending`, `blocked_human` et `blocked_external` sont bloquants.
- Les gates requis `pass` et `ready` sont non bloquants ; ils restent distincts dans le rapport et les compteurs.

## API

```js
const evaluator = new PreflightGateEvaluator({
  taskStates: {
    '8B-DATA-SCHEMAS-VALIDATION': { status: 'done', agent: 'B' },
    '8B-TABLEWIZ-LEGACY-EXTRACTION': { status: 'review', agent: 'A' }
  }
});

const report = evaluator.evaluate(preflightDocument);
```

`taskStates` accepte aussi une `Map` et des valeurs courtes (`'done'`, `'review'`, etc.).

### Override explicite

```js
const report = evaluator.evaluate(preflightDocument, {
  overrides: {
    'P9-007': {
      status: 'pass',
      reason: 'Validation humaine enregistrée le 2026-08-12'
    }
  }
});
```

L'override est volontairement séparé des locks : il permet d'enregistrer une information de validation externe/humaine sans prétendre la déduire d'une tâche technique.

## Rapport

Chaque gate expose notamment :

- `snapshot_status` ;
- `effective_status` ;
- `status_source` : `snapshot`, `coordination`, `coordination-incomplete`, `snapshot-blocker` ou `override` ;
- `coordination_tasks` ;
- `coordination_state` ;
- `override_reason`.

La synthèse fournit :

- compte par statut ;
- liste des gates réellement bloquants ;
- `ready_for_real_integration` ;
- `preparation_work_allowed_now`.

`assertReady()` retourne le rapport lorsque tous les gates requis sont dans un état d'entrée non bloquant (`pass` ou `ready`). Sinon il lève `PreflightGateEvaluatorError` avec le code `PREFLIGHT_BLOCKED`.

## Frontières

Cette brique :

- ne modifie pas `lot9-preflight.machine.json` ;
- ne modifie pas les locks ;
- ne décide pas qu'une validation visuelle/HUMAN est réussie ;
- ne consulte pas GitHub ;
- ne remplace pas un runner de tests ;
- ne modifie ni démo ni roadmap canonique.

Elle fournit uniquement un calcul déterministe et testable à partir d'informations injectées.
