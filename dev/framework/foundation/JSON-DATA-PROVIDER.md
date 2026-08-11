# JsonDataProvider — Provider JSON statique

## Objectif

`JsonDataProvider` est le premier provider concret du Framework V2. Il permet de charger une base métier constituée d'un registre et d'une ou plusieurs collections JSON sans coupler les composants UI aux fichiers physiques.

## Périmètre initial

- lecture seule ;
- chargement d'un `DataRegistry` fourni en mémoire ou par URL ;
- liste des collections déclarées ;
- chargement d'une collection JSON ;
- récupération d'un enregistrement par identifiant ;
- support des collections sous forme de tableau JSON ou d'objet `{ "records": [...] }` ;
- cache mémoire activé par défaut ;
- invalidation du cache globale ou par collection ;
- injection d'une fonction `fetch` pour tests ou environnements spécifiques.

## Non inclus à cette étape

- résolution automatique des relations ;
- validation détaillée des records contre leur schéma ;
- écriture dans les fichiers JSON ;
- moteur de requête avancé ;
- transactions.

Ces responsabilités restent séparées et seront traitées par `DataResolver`, `DataValidator` et les futurs providers capables d'écriture.

## Chaîne actuelle

```text
DataRegistry
    ↓
JsonDataProvider
    ↓
collection JSON
    ↓
records canoniques
```

La prochaine étape ajoute la couche :

```text
records canoniques
    ↓
DataResolver
    ↓
relations résolues / représentations exploitables
```

## Dataset de démonstration

Le dossier `dev/framework/demo/data/` contient volontairement un exemple générique, sans vocabulaire métier spécifique :

- `registry.json` ;
- `categories.json` ;
- `items.json`.

`items.category_id` référence `categories.id`. Ce lien servira au développement et aux tests du prochain `DataResolver`.

## Test réalisé avant commit

Le provider a été exécuté avec une fonction `fetch` injectée afin de vérifier :

- `init()` ;
- `listCollections()` ;
- `getRecord()` avec l'`idField` déclaré dans le registre ;
- le cache ;
- `clearCache()` ;
- le maintien du contrat read-only hérité de `DataProvider`.

Résultat : tests passants.
