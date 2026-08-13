# Site Generation Runner

## Objet

`run-site-generation.mjs` transforme le contrat déclaratif `nlab.site-generation-checklist` V1 en orchestration contrôlée, sans intégrer de logique métier ni de moteur de rendu spécifique.

Le runner reste **DOM-free**, renderer-neutral et dépend uniquement de handlers injectés par le consommateur.

## Responsabilités

- vérifier l'identité/version du checklist ;
- vérifier les IDs, dépendances, modes et politiques d'échec ;
- détecter les cycles de dépendances ;
- calculer un ordre topologique déterministe ;
- exécuter un handler par `stage.id` ou par `stage.type` ;
- exiger une décision explicite lorsqu'un stage HUMAN/hybrid n'a pas de handler ;
- refuser silencieusement l'absence de handler machine en produisant un échec structuré ;
- appliquer `stop`, `warn` ou `continue` ;
- propager les dépendances non satisfaites sous forme `skipped` ;
- produire un rapport `nlab.site-generation-run-report` V1.

## Contrat des handlers

Un handler reçoit :

```js
{
  stage,
  context,
  dependencies
}
```

et retourne, de manière synchrone ou asynchrone :

```js
{
  status: 'pass' | 'warn' | 'fail' | 'blocked',
  outputs: {},
  warnings: [],
  details: {}
}
```

Le runner ne connaît pas la nature interne des artefacts. Le stage déclare les entrées/sorties ; le handler concret décide comment les produire.

## Décisions HUMAN / hybrid

Le paramètre `decisions` est indexé par `stage.id`.

Sans handler ni décision explicite :

- `human` ou `hybrid` → `blocked` avec `explicit_decision_required` ;
- `machine` → `fail` avec `handler_required`.

Le runner ne transforme donc jamais implicitement une étape HUMAN en succès.

## Politiques d'échec

- `stop` : un stage requis en `fail`/`blocked` arrête la chaîne ; les suivants deviennent `skipped` ;
- `warn` : un `fail` est dégradé en `warn` et enregistré dans le rapport ;
- `continue` : le résultat reste `fail`, mais le runner ne force pas l'arrêt global ; les dépendants directs restent néanmoins non satisfaits et sont `skipped`.

## Rapport machine

Le rapport contient notamment :

- `ok` ;
- `halted` / `halt_stage` ;
- `blocking_stage_ids` ;
- `skipped_required_stage_ids` ;
- warnings structurés ;
- résultat de chaque stage, y compris `raw_status`, outputs et détails.

## Limites V1

Le runner :

- ne charge aucun dataset métier ;
- ne génère aucune page ;
- ne publie aucune preview ;
- ne choisit aucun renderer ;
- ne modifie pas le workspace ;
- ne remplace pas le `Site Workspace Validator` ;
- ne valide pas lui-même les artefacts métier produits par les handlers.

Ces opérations restent fournies par les briques concrètes injectées lors d'un vertical slice.

## Test

`dev/framework/tests/site-generation-runner.test.mjs` utilise le fixture canonique `site-generation-checklist.json` et couvre :

- parcours complet réussi ;
- arrêt sur validation requise ;
- politique `warn` ;
- décision hybrid explicite ;
- handler machine absent ;
- dépendance inconnue ;
- cycle de dépendances.

Commande :

```bash
node dev/framework/tests/site-generation-runner.test.mjs
```
