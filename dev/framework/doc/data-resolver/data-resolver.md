# DataResolver — contrat de robustesse

`DataResolver` résout les relations déclarées dans le registre data en s'appuyant sur `DataIndex`.

## Garanties

- les collections sont recherchées uniquement parmi les **propriétés propres** du registre ;
- un nom hérité (`constructor`, `__proto__`, etc.) n'est jamais interprété comme une collection ;
- `provider.getCollection()` doit exister et retourner un tableau ;
- `resolveRecord()` exige un objet record ;
- `relations` doit être un tableau ;
- seules les cardinalités `one` / `many` sont acceptées ;
- seules les policies `warn` / `error` / `keep` / `null` sont acceptées ;
- les index sont mis en cache via `DataIndex` et peuvent être invalidés par collection avec `clearIndexes(collection)`.

## Erreurs structurées

`DataResolverError` expose notamment :

- `PROVIDER_REQUIRED` ;
- `REGISTRY_REQUIRED` / `NOT_INITIALIZED` ;
- `INVALID_COLLECTION_NAME` / `UNKNOWN_COLLECTION` ;
- `GET_COLLECTION_REQUIRED` / `INVALID_COLLECTION_DATA` ;
- `INVALID_RECORD` / `INVALID_RELATIONS` / `INVALID_RELATION` ;
- `INVALID_CARDINALITY` / `INVALID_MISSING_POLICY` / `INVALID_RELATION_VALUE` ;
- `MISSING_REQUIRED_REFERENCE` / `REFERENCE_NOT_FOUND` lorsque la policy est `error`.

## Résolution

Pour `targetField`, l'ordre est :

1. `relation.targetField` si fourni ;
2. `idField` de la collection cible ;
3. `id` en dernier recours.

Cela reste cohérent avec le contrat JSON Schema consolidé.

## Test dédié

`tests/data-resolver-robustness.test.mjs` couvre :

- relation simple + relation multiple ;
- fallback vers `target.idField` ;
- policy `keep` et warning de référence absente ;
- réutilisation du cache et invalidation ciblée ;
- protection contre les propriétés héritées ;
- collections provider non-array ;
- cardinalités et policies invalides ;
- provider sans `getCollection`.
