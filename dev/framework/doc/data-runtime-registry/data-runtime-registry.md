# DataRuntimeRegistry — contrat de registre runtime

## Objectif

`DataRuntimeRegistry` associe des types de providers et d'adapters à des factories. Les deux familles restent séparées et une seconde registration ne doit pas remplacer silencieusement une factory existante.

## Types

Les types doivent être des chaînes non vides et sont normalisés par `trim()`.

Providers et adapters utilisent des maps distinctes : un provider `json` et un adapter `json` peuvent donc coexister.

## Registration

- `registerProvider(type, factory)` ;
- `registerAdapter(type, factory)`.

Une factory doit être une fonction. Une registration sur un type déjà présent lève une erreur par défaut.

Le remplacement doit être explicite avec `{ replace: true }`.

Les méthodes de registration retournent l'instance pour permettre le chaînage historique.

## Création

`createProvider(type, options)` et `createAdapter(type, options)` :

1. normalisent le type ;
2. vérifient que la factory existe ;
3. valident les options comme objet ;
4. transmettent une copie superficielle des options à la factory.

Une mutation ultérieure de l'objet d'options fourni par l'appelant ne modifie donc pas le conteneur reçu par la factory.

Les erreurs levées par la factory elle-même ne sont pas masquées.

## Introspection

- `hasProvider(type)` ;
- `hasAdapter(type)` ;
- `listProviders()` ;
- `listAdapters()` ;
- `size()` — total providers + adapters ;
- `size('providers')` / `size('adapters')` — taille ciblée.

Les formes singulières `provider` / `adapter` sont également acceptées par `size()` et `clear()`.

## Nettoyage

- `unregisterProvider(type)` ;
- `unregisterAdapter(type)` ;
- `clear('providers')` ;
- `clear('adapters')` ;
- `clear()` pour les deux registres.

Les suppressions ciblées retournent un booléen. `clear()` retourne le nombre de factories retirées.

## Tests

`dev/framework/tests/data-runtime-registry.test.mjs` couvre :

- coexistence d'un même type provider/adapter ;
- normalisation des types ;
- options copiées ;
- duplicate registration et remplacement explicite ;
- list / has / size ;
- unregister ;
- clear ciblé/global ;
- types, factories, options et kind invalides.

## Hors périmètre

Ce lot ne modifie pas les factories concrètes, `DataProvider`, `DataAdapter`, DataIndex ou TableWiz. Il ne rend pas les créations asynchrones et n'ajoute pas de résolution automatique par source.
