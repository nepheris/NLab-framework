# DataJoinFieldCatalog

## Rôle

`DataJoinFieldCatalog` transforme un tableau de records en métadonnées de champs utilisables par le futur éditeur graphique de jointures.

Il ne modifie ni les données, ni `DataJoinSpec`, ni `DataJoinExecutor`, ni `DataJoinWorkspace`. Il fournit uniquement :

- une liste plate de champs ;
- un arbre hiérarchique ;
- les chemins canoniques ;
- les types et statistiques observés ;
- l'indication qu'un champ est réellement utilisable comme clé avec `DataJoinSpec` V1 ;
- des warnings structurés lorsque la source contient une structure non adressable ou pathologique.

La brique est DOM-free et ne dépend d'aucun adapter ou format de fichier.

## API

```js
import { DataJoinFieldCatalog } from '../../core/data-join-field-catalog.js';

const catalog = new DataJoinFieldCatalog({
  maxRows: 1000,
  maxDepth: 8,
  maxFields: 1000,
  maxExamples: 3
}).build(rows);
```

Raccourci :

```js
import { buildDataJoinFieldCatalog } from '../../core/data-join-field-catalog.js';

const catalog = buildDataJoinFieldCatalog(rows, options);
```

## Sortie

```js
{
  rows: {
    total,
    sampled,
    objectRows,
    nonObjectRows
  },
  limits: {
    maxRows,
    maxDepth,
    maxFields,
    maxExamples
  },
  fields: [...],
  tree: [...],
  warnings: [...]
}
```

### Descripteur de champ

```js
{
  name: 'id',
  segments: ['customer', 'id'],
  pointer: '/customer/id',
  specPath: 'customer.id',
  depth: 2,
  type: 'string',
  types: ['string'],
  present: 98,
  missing: 2,
  nulls: 0,
  distinct: 87,
  examples: ['CUS001', 'CUS002', 'CUS003'],
  joinable: true
}
```

`tree` utilise le même descripteur avec un tableau `children` supplémentaire.

## Deux systèmes de chemins

### JSON Pointer

`pointer` est toujours le chemin canonique de présentation, conformément à RFC 6901.

Exemple :

```text
clé JSON : slash/key
pointer  : /slash~1key
```

Les caractères `~` et `/` sont échappés respectivement en `~0` et `~1`.

### Chemin DataJoinSpec V1

`specPath` représente le chemin réellement compris par `DataJoinSpec` V1, qui utilise actuellement des segments séparés par `.`.

```text
/customer/id  → customer.id
```

Une clé littérale contenant un point reste parfaitement visible via JSON Pointer, mais elle n'est pas adressable sans ambiguïté par le contrat V1 :

```text
/a.b → specPath: null, joinable: false
```

Le catalogue émet alors `UNADDRESSABLE_JOIN_PATH`.

Cette distinction empêche l'interface graphique de proposer une relation que le moteur ne saurait ensuite exécuter.

## Typage observé

Types reconnus :

- `string` ;
- `number` ;
- `boolean` ;
- `null` ;
- `object` ;
- `array` ;
- `non-finite-number` ;
- `undefined` ;
- `bigint` ;
- `symbol` ;
- `function` ;
- `unsupported-object`.

`type` vaut :

- le type non-null unique observé ;
- `mixed` lorsque plusieurs types non-null sont observés ;
- `null` si le champ n'a été observé qu'à `null`.

`types` conserve la liste complète triée des types observés, y compris `null`.

## Champ joinable

`joinable:true` signifie que :

1. `specPath` existe ;
2. au moins une valeur scalaire non nulle a été observée ;
3. tous les types non nuls observés sont parmi `string`, `number`, `boolean`.

Un champ mixte `number|string` peut donc rester candidat : le `DataJoinSpec` décidera ensuite si une coercition est souhaitée.

Les objets, tableaux, valeurs non finies et types JS non sérialisables ne sont jamais marqués joinable.

## Statistiques

Pour chaque champ :

- `present` : nombre de lignes échantillonnées où le champ a été rencontré ;
- `missing` : lignes échantillonnées où il n'a pas été rencontré ;
- `nulls` : occurrences explicites de `null` ;
- `distinct` : nombre de valeurs scalaires distinctes observées dans l'échantillon ;
- `examples` : premières valeurs scalaires distinctes, bornées par `maxExamples`.

La distinction des valeurs distinctes est typée : le nombre `1` et la chaîne `'1'` sont deux valeurs différentes.

## Structures hiérarchiques

Les objets simples sont parcourus récursivement jusqu'à `maxDepth`.

Les arrays ne sont pas parcourus dans V1 : une clé de jointure ne doit pas dépendre implicitement d'un index ou d'un élément de tableau.

Les objets de prototype non standard (`Date`, instances de classes, etc.) sont décrits comme `unsupported-object` et ne sont pas parcourus.

## Bornes de sécurité

Valeurs par défaut :

```text
maxRows     = 1000
maxDepth    = 8
maxFields   = 1000
maxExamples = 3
```

Ces limites rendent l'analyse prévisible même sur des documents importants ou irréguliers.

Warnings principaux :

- `ROW_SAMPLE_LIMIT` ;
- `FIELD_LIMIT_REACHED` ;
- `DEPTH_LIMIT_REACHED` ;
- `NON_OBJECT_ROWS` ;
- `UNADDRESSABLE_JOIN_PATH` ;
- `UNSAFE_FIELD_SKIPPED` ;
- `CYCLIC_VALUE_SKIPPED` ;
- `NON_FINITE_VALUE` ;
- `UNSUPPORTED_FIELD_VALUE`.

## Sécurité

Les segments suivants ne sont jamais traversés :

```text
__proto__
prototype
constructor
```

Un cycle dans un record n'interrompt pas l'analyse entière : la branche cyclique est signalée puis ignorée.

Le catalogue ne modifie jamais les records source.

## Préparation de l'éditeur graphique

Pour chaque côté du `DataJoinWorkspace`, l'UI pourra :

1. binder une collection ;
2. construire son `DataJoinFieldCatalog` ;
3. rendre `tree` dans un sélecteur hiérarchique ;
4. désactiver visuellement les nœuds `joinable:false` ;
5. utiliser `specPath` lorsqu'un champ est choisi ;
6. créer une paire `{left, right}` dans `DataJoinSpec` ;
7. lancer `diagnose()` avant toute exécution.

Le rapprochement automatique de champs gauche/droite (nom similaire, type compatible, cardinalité probable) reste volontairement un lot distinct.

## Vérification

```bash
node dev/framework/tests/data-join-field-catalog.test.mjs
```

Couverture : chemins imbriqués, échappement JSON Pointer, clé littérale avec `.`, présence/missing/null, types mixtes, arrays, cycles, clés sensibles, objets non supportés, nombres non finis et toutes les limites configurables.
