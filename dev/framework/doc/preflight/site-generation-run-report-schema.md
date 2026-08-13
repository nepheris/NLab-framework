# Site Generation Run Report — contrat machine V1

## Objet

Le fichier `data/site-generation-run-report.schema.json` fige le contrat du rapport retourné par `tools/site/run-site-generation.mjs`.

Le rapport reste générique : il décrit l'exécution d'une checklist de génération de site sans embarquer de logique métier, de renderer concret ou de convention Recettes du Cœur.

## Identité

- `schema`: `nlab.site-generation-run-report`
- `version`: `1`
- JSON Schema: Draft 2020-12
- `$id`: `https://nlab.dev/schemas/site-generation-run-report.schema.json`

## Enveloppe

Le rapport contient :

- horodatage `generated_at` ;
- identité synthétique de la checklist (`name`, `stage_count`) ;
- `ok` ;
- état d'arrêt (`halted`, `halt_stage`) ;
- listes des stages bloquants et des stages requis sautés ;
- warnings normalisés ;
- résultats ordonnés des stages.

## Résultat de stage

Statuts autorisés :

- `pass`
- `warn`
- `fail`
- `blocked`
- `skipped`

Un stage exécuté expose `raw_status`, `outputs`, `warnings` et `details`.

Un stage `skipped` expose obligatoirement `reason`. Il n'invente pas de `raw_status`, car aucun handler ou arbitrage n'a été exécuté.

Les modes sont ceux du contrat de checklist : `machine`, `human`, `hybrid`.

## Invariants fonctionnels

- `ok=true` seulement lorsqu'il n'existe aucun stage requis bloquant et aucun stage requis sauté ;
- `halt_stage` est `null` lorsqu'aucun arrêt n'a eu lieu ;
- les identifiants de stages bloquants/sautés sont uniques ;
- les warnings racine référencent explicitement leur `stage_id` ;
- le schéma n'impose pas la structure interne de `details` ou `outputs`, qui appartient au handler de stage.

## Test de contrat

`tests/site-generation-run-report-schema.test.mjs` :

1. vérifie l'identité et les enums du JSON Schema ;
2. exécute le vrai `runSiteGeneration()` sur la checklist de référence avec handlers/décisions injectés ;
3. vérifie le rapport nominal ;
4. vérifie un scénario bloqué avec arrêt et stage requis sauté ;
5. contrôle que les résultats produits restent compatibles avec les statuts/modes déclarés par le schéma.

Le test reste sans dépendance npm de validation JSON Schema : l'intégrité globale des schémas continue d'être couverte par le contrat `data-schema-integrity` du framework.

## Frontières

Ce lot ne :

- modifie pas le runner ;
- n'ajoute aucun handler concret ;
- ne lance aucune génération réelle ;
- ne touche pas TableWiz, V20, la démo, l'architecture ou la roadmap canonique ;
- ne change aucune décision HUMAN.
