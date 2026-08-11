# DataResolver — Résolution des relations

## Objectif

`DataResolver` construit une vue exploitable des relations déclarées dans le `DataRegistry` sans modifier les données canoniques fournies par le `DataProvider`.

## Principe

Les données originales restent intactes. La résolution retourne une enveloppe :

```text
{
  data,       // objet canonique d'origine
  resolved,   // objets liés résolus
  issues      // références manquantes ou anomalies non bloquantes
}
```

Exemple :

```text
ITEM001.category_id = "CAT001"
                 ↓
resolved.category_id = { id: "CAT001", label: "Alpha", ... }
```

Le champ canonique `category_id` reste donc `CAT001`.

## Fonctionnalités initiales

- indexation paresseuse des collections ;
- cache d'index par `collection:field` ;
- invalidation globale ou par collection ;
- relations `one` ;
- relations `many` ;
- `targetField` configurable ;
- détection des clés d'index dupliquées ;
- gestion des politiques `onMissing` :
  - `error` : exception ;
  - `warn` : valeur résolue `null` + issue ;
  - `keep` : conserve la référence brute + issue ;
  - `null` : valeur résolue `null` sans issue ;
- contrôle de cardinalité entre scalaire et tableau.

## API initiale

```text
init()
getIndex(collectionName, field?)
resolveRecord(collectionName, record)
resolveCollection(collectionName)
clearIndexes(collectionName?)
```

## Frontière de responsabilité

`DataResolver` ne valide pas la structure complète des objets métier. Il vérifie uniquement ce qui est nécessaire à la résolution des relations.

La validation générale des données reste la responsabilité de `DataValidator`.

## Dataset de démonstration

Le dataset comporte maintenant :

```text
items.category_id  → categories.id   (one)
items.tag_ids      → tags.code        (many)
```

Cela permet de tester les deux cardinalités dès la fondation.

## Tests réalisés

Tests exécutés avec Node.js avant commit :

- résolution `one` ;
- résolution `many` ;
- conservation des IDs canoniques ;
- récupération d'une référence inexistante en mode `warn` ;
- collecte des issues ;
- résolution d'une collection complète.

Résultat : tests passants.
