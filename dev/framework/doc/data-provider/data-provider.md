# DataProvider — contrat abstrait robuste

## Objectif

`DataProvider` définit le contrat commun des providers de données du framework. Le durcissement reste compatible avec `JsonDataProvider` et ne modifie pas les providers concrets.

## Options

Le constructeur accepte un objet d'options et en conserve une copie superficielle.

- `null` / `undefined` sont normalisés en `{}` ;
- tableau ou valeur primitive sont rejetés.

Une modification ultérieure de l'objet d'options fourni ne modifie donc pas le conteneur `provider.options`.

## Capacités

`capabilities` conserve le contrat historique :

- `read` ;
- `write` ;
- `delete` ;
- `query` ;
- `transactions`.

`supports(capability)` fournit une interrogation booléenne défensive. Une capacité inconnue ou vide retourne `false`.

## Cycle de vie

Les implémentations de base `init()` et `close()` retournent l'instance. Les providers concrets restent libres de surcharger ces méthodes.

## Lecture d'un record

`getRecord(collectionName, id, options)` :

1. valide et normalise le nom de collection ;
2. valide `options` ;
3. valide/normalise `idField` (défaut `id`) ;
4. charge la collection avec `getCollection()` ;
5. exige un résultat itérable non chaîne ;
6. retourne le premier record dont `record[idField] === id`, sinon `null`.

Une collection retournée sous une forme invalide produit `DataProviderError` avec code `INVALID_COLLECTION_RESULT` au lieu d'une erreur JavaScript indirecte.

Les codes de validation ajoutés sont :

- `INVALID_COLLECTION_NAME` ;
- `INVALID_ID_FIELD` ;
- `INVALID_COLLECTION_RESULT`.

## Méthodes abstraites / lecture seule

`listCollections()` et `getCollection()` conservent le code `NOT_IMPLEMENTED`, avec le nom de l'opération dans `details`.

Les écritures de la classe de base restent interdites avec code `READ_ONLY` :

- `saveCollection` ;
- `saveRecord` ;
- `deleteRecord`.

`details` indique maintenant l'opération et la collection concernée (ainsi que l'ID pour `deleteRecord`).

## Compatibilité JsonDataProvider

Le test dédié instancie le `JsonDataProvider` réel avec un registry et un `fetchFn` factice, puis vérifie `init()` et `getRecord()` avec l'`idField` défini par la collection.

## Tests

`dev/framework/tests/data-provider-robustness.test.mjs` couvre :

- copie/validation des options ;
- capacités et `supports()` ;
- cycle `init/close` de base ;
- getRecord standard et idField personnalisé ;
- collection itérable non-array ;
- résultat collection invalide ;
- validations collection/idField/options ;
- erreurs abstraites/read-only structurées ;
- compatibilité avec `JsonDataProvider`.

## Hors périmètre

Ce lot ne modifie pas `JsonDataProvider`, DataResolver, DataIndex, TableWiz ou la stratégie de persistance des providers.
