# DataAdapter — contrat abstrait

## Objectif

`DataAdapter` définit le contrat minimal d'un adaptateur de données : détecter s'il sait traiter une source puis normaliser une entrée. La classe de base ne contient aucune logique métier.

## Options

Le constructeur accepte un objet d'options :

- `null` / `undefined` sont normalisés en `{}` ;
- tableaux et primitives sont rejetés ;
- le conteneur est copié superficiellement.

Une mutation ultérieure de l'objet d'options fourni ne modifie donc pas `adapter.options`.

## Type

La classe de base expose `type === "abstract"`. Une implémentation concrète peut surcharger ce getter.

## Détection

`canHandle(source)` retourne `false` par défaut. Les adapters concrets implémentent leur propre détection.

## Normalisation

`normalize(input, context)` doit être implémentée par une sous-classe.

La classe abstraite :

1. valide `context` comme objet ;
2. en copie le conteneur ;
3. lève `DataAdapterError` avec code `NOT_IMPLEMENTED` ;
4. fournit dans `details` : `operation`, `adapterType`, `context`.

Cela donne aux outils de diagnostic un contrat d'erreur stable sans imposer de schéma de données à l'adapter concret.

## Erreur structurée

`DataAdapterError` conserve :

- `name = "DataAdapterError"` ;
- `message` ;
- `code` ;
- `details`.

## Tests

`dev/framework/tests/data-adapter-contract.test.mjs` couvre :

- copie et validation des options ;
- type abstrait ;
- `canHandle()` par défaut ;
- erreur `normalize()` structurée ;
- copie du contexte ;
- contexte invalide ;
- sous-classe concrète compatible ;
- construction directe de `DataAdapterError`.

## Hors périmètre

Ce lot n'ajoute aucun adapter concret, ne modifie pas DataProvider, DataSource, DataResolver, DataIndex ou TableWiz et ne change pas le pipeline de résolution runtime.
