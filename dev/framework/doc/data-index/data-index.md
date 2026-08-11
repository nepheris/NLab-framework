# DataIndex — contrat de robustesse

`DataIndex` construit et conserve des index `Map` par couple `collection / field` pour les validations et résolutions data du framework.

## Contrat

- `collectionName` et `field` sont des chaînes non vides ;
- `build()` attend un tableau de records ;
- les valeurs `undefined`, `null` et chaîne vide ne sont pas indexées ;
- deux valeurs identiques pour une même clé d'index provoquent `DUPLICATE_INDEX_KEY` ;
- une construction qui échoue est **atomique** : l'index précédemment publié reste intact ;
- plusieurs champs peuvent être indexés pour une même collection ;
- `clear(collection)` ne supprime que les index de la collection exacte ;
- `clear()` sans argument supprime tous les index.

## Erreurs

Les erreurs de contrat utilisent `DataIndexError` avec `code` et `details` :

- `INVALID_COLLECTION` ;
- `INVALID_FIELD` ;
- `INVALID_RECORDS` ;
- `DUPLICATE_INDEX_KEY`.

Pour un doublon, `details` expose la collection, le champ, la valeur, l'index de la première occurrence et celui de la seconde.

## Introspection

- `has(collection, field)` indique si l'index existe ;
- `size()` retourne le nombre total d'index publiés ;
- `size(collection)` retourne le nombre d'index publiés pour cette collection.

## Compatibilité runtime

`DataValidator` continue à consommer `get()` et `build()` avec le même modèle : un `Map` est renvoyé et utilisé pour les tests de présence des références.

## Test dédié

`tests/data-index-robustness.test.mjs` couvre :

- construction normale et champs multiples ;
- valeurs non indexables ;
- doublons et atomicité ;
- entrées invalides ;
- clear ciblé sans collision de préfixe ;
- clear global ;
- introspection `has/size`.
