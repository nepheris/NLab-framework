# Representative synthetic data fixtures

Ce lot prépare des fixtures représentatives autorisées par le préflight Lot 9 **sans utiliser de donnée métier réelle**.

Les fichiers se trouvent sous :

```text
dev/framework/tests/fixtures/data/
├── registry.json
├── groups.json
├── tags.json
└── items.json
```

## Objectifs couverts

Le jeu synthétique exerce les contrats génériques déjà présents dans le Framework :

- `data-registry.schema.json` / `collection.schema.json` / `relation.schema.json` ;
- `JsonDataProvider` avec provider `json-static` ;
- collection JSON sous forme de tableau ;
- collection JSON sous forme `{records:[...]}` ;
- `idField` personnalisé ;
- `labelField` ;
- relation `one` avec `targetField` explicite ;
- relation `many` ;
- relation requise avec `onMissing:error` ;
- relation optionnelle avec `onMissing:warn` ;
- cache provider et `refresh:true` ;
- résolution réelle via `DataResolver`.

## Modèle synthétique

Le vocabulaire reste volontairement abstrait :

- `groups` ;
- `tags` ;
- `items`.

Il ne reprend aucun nom, ID, contenu ou règle de Recettes du Cœur. Le test contient une garde explicite contre le vocabulaire `recette/recipe` dans les fixtures.

## Formes de payload

`groups.json` et `items.json` sont des tableaux directs.

`tags.json` utilise :

```json
{
  "records": [ ... ]
}
```

Cela couvre les deux formes acceptées par `JsonDataProvider`.

## Relations

La collection `items` définit :

- `groupCode → groups.code`, cardinalité `one`, requise, erreur si référence absente ;
- `tagIds → tags.id`, cardinalité `many`, optionnelle, warning si référence absente.

`ITEM-200` contient volontairement `TAG-MISSING`. Ce n'est pas une fixture invalide : la relation autorise explicitement `onMissing:"warn"`. Le test vérifie que `DataResolver` renvoie `null` pour cette cible et produit exactement un issue `REFERENCE_NOT_FOUND` de niveau warning.

## Test d'intégration

`representative-data-fixtures.test.mjs` charge les fichiers du dépôt puis instancie les vraies classes :

```js
new JsonDataProvider({ registry, baseUrl, fetchFn, cache:true })
new DataResolver({ provider, registry })
```

Le `fetchFn` est injecté et sert les fichiers locaux en mémoire. Aucun réseau n'est requis.

Le test vérifie notamment :

- découverte des trois collections ;
- lecture tableau et `records[]` ;
- recherche `getRecord()` par `uid` ;
- absence de refetch quand le cache est actif ;
- refetch avec `{refresh:true}` ;
- résolution des groupes/tags ;
- warning de référence optionnelle absente ;
- réutilisation des collections en cache lors de la résolution ;
- purge du cache à `close()`.

## Frontières

Ces fixtures :

- ne représentent aucun vertical slice métier ;
- ne sont pas des données de production ;
- ne créent aucun dossier `Sites/` ;
- ne dépendent pas du dépôt Recettes du Cœur actuellement inaccessible ;
- ne modifient ni provider, resolver ni schémas existants ;
- peuvent être réutilisées par les futurs tests d'intégration Data sans introduire de logique métier dans le Framework.
