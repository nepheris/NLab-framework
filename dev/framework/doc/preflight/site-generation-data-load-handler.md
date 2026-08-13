# Site Generation — handler `data-load`

## Objet

`tools/site/handlers/data-load-handler.mjs` est le premier handler machine concret du pipeline générique Lot 9.

Il relie le stage déclaratif `data-load` à l'interface `DataProvider` existante sans embarquer de logique métier, de noms de collections imposés ni de règles propres à un site.

## Entrée

Le factory `createDataLoadStageHandler()` reçoit :

- `provider` — instance compatible `DataProvider` ;
- `collections` — liste optionnelle de collections à charger ; si absente, `provider.listCollections()` est utilisé ;
- `refresh` — force le rafraîchissement côté provider ;
- `initialize` — appelle `provider.init()` avant lecture (défaut `true`) ;
- `close` — ferme le provider à la fin du stage (défaut `false`) ;
- `allowEmpty` — autorise explicitement zéro collection (défaut `false`).

## Sortie nominale

Le handler retourne `status: pass` et publie :

```json
{
  "data.loaded": {
    "collections": {
      "collection-a": [],
      "collection-b": []
    },
    "collection_names": ["collection-a", "collection-b"],
    "record_counts": {
      "collection-a": 0,
      "collection-b": 0
    },
    "total_records": 0
  }
}
```

Les données restent sérialisables afin de pouvoir être transportées par le `SiteGenerationRunner` vers les stages dépendants.

## Échec contrôlé

Une erreur du provider n'est pas laissée remonter hors du pipeline. Elle devient un résultat structuré :

- `status: fail` ;
- `details.reason: data_load_failed` ;
- collection concernée ;
- nom/code/message de l'erreur source.

Ainsi le runner applique normalement la politique `on_failure` du stage.

## Intégration avec le registre

Le handler peut être enregistré par type :

```js
registry.registerType(
  'data-load',
  createDataLoadStageHandler({ provider }),
  { capability: 'data.load' }
);
```

`registry.buildHandlers(checklist)` fournit alors directement le mapping attendu par `runSiteGeneration()`.

## Test

`tests/site-generation-data-load-handler.test.mjs` vérifie :

1. chargement automatique de toutes les collections avec le vrai `JsonDataProvider` ;
2. sous-ensemble explicite et déduplication ;
3. transformation d'une erreur provider en `fail` structuré ;
4. refus d'un type de stage incorrect ;
5. intégration `JsonDataProvider → HandlerRegistry → SiteGenerationRunner`.

## Frontières

Ce lot ne :

- choisit aucun domaine métier ;
- n'impose aucun schéma de collection ;
- ne valide pas encore les enregistrements ;
- ne résout pas encore les relations ;
- ne modifie pas le runtime data existant ;
- ne requiert aucune validation HUMAN.
