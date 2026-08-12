# LivePreflight report schema V1

Le rapport de succès émis par `run-live-preflight.mjs` possède désormais un contrat machine JSON Schema Draft 2020-12 :

`dev/framework/data/live-preflight-report.schema.json`

## Portée

Le schéma décrit uniquement un rapport **réussi au niveau de l'outil**. Les erreurs CLI (`ACTIVE_LOCK_OVERLAP`, JSON invalide, registre de locks invalide, override invalide, etc.) utilisent une enveloppe d'erreur séparée et ne sont pas des `nlab.live-preflight-report`.

## Invariants racine

Le rapport exige :

- `schema = "nlab.live-preflight-report"` ;
- `version = 1` ;
- `generated_at` au format date-time ;
- `source` ;
- `coordination` ;
- `lock_health` ;
- `evaluation` ;
- `ready_for_real_integration`.

La racine utilise `additionalProperties: false` afin que tout changement d'enveloppe devienne explicite et versionné.

## Coordination

Un rapport de succès ne peut être produit qu'après le contrôle des collisions de locks. Le schéma fixe donc :

```json
{
  "coordination": {
    "active_lock_overlaps": 0
  }
}
```

Si une collision existe, le runner lève `ACTIVE_LOCK_OVERLAP` avant de produire ce rapport.

## Santé des locks

`lock_health.ok` est fixé à `true` pour la même raison : un registre structurellement invalide provoque une erreur du runner avant génération du rapport.

Les warnings restent extensibles. Seul leur `code` est exigé ; les détails spécifiques à un warning ne sont pas figés dans V1.

## Evaluation

Le schéma verrouille les structures stables de `PreflightGateEvaluator` :

- `metadata` ;
- `policy` ;
- `gates` ;
- `summary` ;
- `warnings`.

Chaque gate exige :

- `gate_id` ;
- `snapshot_status` ;
- `effective_status` ;
- `status_source` ;
- `coordination_tasks` ;
- `coordination_state` ;
- `override_reason`.

Les autres champs issus du checklist restent extensibles (`additionalProperties: true`) afin de ne pas transformer chaque ajout documentaire en rupture du format de rapport.

## Statuts

`$defs.gateStatus` reprend exactement le vocabulaire de `PreflightGateEvaluator` :

- `pass` ;
- `ready` ;
- `in_progress` ;
- `pending` ;
- `blocked_human` ;
- `blocked_external`.

Le test vérifie que cette liste reste identique à `PreflightGateEvaluator.gateStatuses()`.

## Test de contrat

`live-preflight-report-schema.test.mjs` n'ajoute aucune dépendance JSON Schema externe. Il :

1. vérifie le draft, `$id`, les champs requis et les constantes ;
2. résout tous les `$ref` JSON Pointer locaux ;
3. génère un **vrai rapport** via `runLivePreflight()` avec des fichiers temporaires ;
4. compare l'enveloppe produite aux champs stables déclarés dans le schéma ;
5. vérifie les enums et structures de gates/synthèse réellement émises.

Ce test ne prétend pas être un validateur JSON Schema générique. Un validateur Draft 2020-12 pourra être ajouté plus tard si le framework adopte une dépendance dédiée.

## Versionnement

Tout changement incompatible de l'enveloppe racine, de `schema`, de `version` ou d'un champ obligatoire stable doit produire une nouvelle version du contrat plutôt qu'une modification silencieuse de V1.
