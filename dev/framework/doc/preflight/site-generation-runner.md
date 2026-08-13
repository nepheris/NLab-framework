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
- propager les outputs réussis comme artefacts cumulés vers les stages suivants ;
- produire un rapport `nlab.site-generation-run-report` V1.

## Contrat des handlers

Un handler reçoit :

```js
{
  stage,
  context,
  dependencies,
  artifacts,
  inputs
}
```

`dependencies` contient uniquement les résultats des stages déclarés dans `depends_on`.

`artifacts` contient une copie de l'ensemble des outputs déjà produits par les stages en `pass` ou `warn`, ainsi que les artefacts initiaux fournis au runner.

`inputs` est une projection de `artifacts` limitée aux clés déclarées dans `stage.inputs`. Cela permet à un stage de consommer un artefact produit plusieurs étapes auparavant sans créer une fausse dépendance d'exécution directe.

Le handler retourne, de manière synchrone ou asynchrone :

```js
{
  status: 'pass' | 'warn' | 'fail' | 'blocked',
  outputs: {},
  warnings: [],
  details: {}
}
```

Le runner ne connaît pas la nature interne des artefacts. Le stage déclare les entrées/sorties ; le handler concret décide comment les produire.

## Artefacts initiaux et propagation

Le paramètre optionnel `artifacts` de `runSiteGeneration()` permet d'injecter des artefacts disponibles avant le premier stage, par exemple `data.registry`, `generation.config` ou d'autres contrats externes au pipeline.

Après chaque stage en `pass` ou `warn`, ses `outputs` sont ajoutés au magasin d'artefacts. Les stages suivants reçoivent une copie de ce magasin ; aucune mutation d'un handler ne modifie directement l'état interne du runner.

Les outputs d'un stage en `fail`, `blocked` ou `skipped` ne sont pas propagés.

Cette séparation est volontaire :

- `depends_on` exprime l'ordre et la condition d'exécution ;
- `inputs` exprime les artefacts nécessaires ;
- `artifacts` transporte les résultats déjà produits.

Ainsi un stage `relations` peut dépendre directement de `validation` tout en consommant `data.loaded` produit par `data-load`.

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

Le magasin d'artefacts cumulé n'est pas dupliqué dans le run report V1 : les outputs restent tracés sur leur stage producteur.

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
- cycle de dépendances ;
- artefacts initiaux ;
- propagation d'un output au-delà de la dépendance directe ;
- projection de `stage.inputs` ;
- refus d'un magasin d'artefacts initial invalide.

Commande :

```bash
node dev/framework/tests/site-generation-runner.test.mjs
```
