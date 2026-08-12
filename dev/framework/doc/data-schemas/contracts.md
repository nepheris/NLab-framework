# Data Schemas — contrats nLab Web Framework

## Périmètre

Ce lot couvre les trois schémas JSON du registre data :

- `data-registry.schema.json` — registre des providers et collections ;
- `collection.schema.json` — définition d'une collection ;
- `relation.schema.json` — relation entre collections.

Les schémas décrivent la structure statique. Les contrôles qui nécessitent de comparer plusieurs clés dynamiques du registre restent du ressort de `DataValidator` (par exemple l'existence d'une collection cible).

## Invariants

### Registry

- `version`, `providers` et `collections` sont obligatoires ;
- `version` est une chaîne non vide ;
- chaque provider déclaré possède un `type` non vide ;
- les propriétés non prévues sont refusées.

### Collection

- `provider`, `source` et `idField` sont obligatoires et non vides ;
- `requiredFields` ne contient pas de doublons ;
- `relations` référence `relation.schema.json` ;
- les propriétés non prévues sont refusées, hors contenu libre de `metadata`.

### Relation

- `field` et `target` sont obligatoires et non vides ;
- `cardinality` vaut `one` ou `many` ;
- `onMissing` vaut `error`, `warn`, `keep` ou `null` ;
- `targetField`, lorsqu'il est fourni, est non vide ;
- si `targetField` est omis, le runtime résout le champ cible avec la règle : `target collection.idField` puis `id` en dernier recours.

## Point corrigé

Le schéma de relation exposait auparavant `targetField: "id"` comme valeur `default`. Cette annotation était trompeuse pour les collections utilisant un identifiant différent (`code`, par exemple), puisque `DataValidator` utilise d'abord l'`idField` de la collection cible.

Le faux défaut statique a été supprimé et remplacé par une description explicite de la résolution dynamique.

## Vérifications du lot

`tests/data-schema-contracts.test.mjs` couvre :

- structure des trois schémas ;
- fixtures positives et négatives ;
- registre réel de la démo ;
- cible de relation inconnue ;
- référence manquante en `warn` ;
- fallback dynamique vers l'`idField` cible lorsque `targetField` est absent.

Un scénario ciblé Node a également été exécuté localement sur les contrats modifiés et le runtime `DataValidator` : le fallback vers `idField="code"` est validé sans erreur ni warning.
